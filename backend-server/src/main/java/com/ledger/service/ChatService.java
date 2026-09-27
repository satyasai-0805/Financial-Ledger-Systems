package com.ledger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledger.dto.ChatResponse;
import com.ledger.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);
    private static final int MAX_REQUESTS_PER_MINUTE = 20;
    private static final long ONE_MINUTE_MS = 60_000L;
    private static final int AI_TIMEOUT_SECONDS = 15;

    @Value("${ollama.api.url:http://localhost:11434/api/generate}")
    private String ollamaApiUrl;

    @Value("${ollama.model:llama3.2}")
    private String ollamaModel;

    @Value("${ai.cloud.api-key:}")
    private String cloudApiKey;

    @Value("${ai.cloud.endpoint:https://api.groq.com/openai/v1/chat/completions}")
    private String cloudEndpoint;

    @Value("${ai.cloud.model:llama-3.3-70b-versatile}")
    private String cloudModel;

    private final LedgerService ledgerService;
    private final ReportService reportService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    // Rate limiting map: username -> list of request timestamps
    private final ConcurrentHashMap<String, List<Long>> rateLimitMap = new ConcurrentHashMap<>();

    @Autowired
    public ChatService(LedgerService ledgerService, ReportService reportService, ObjectMapper objectMapper) {
        this.ledgerService = ledgerService;
        this.reportService = reportService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(6))
                .build();
    }

    public ChatResponse processChatRequest(String username, String userMessage) {
        if (userMessage == null || userMessage.trim().isEmpty()) {
            return ChatResponse.error("Message cannot be empty.");
        }

        // 1. Rate Limiting Check
        if (isRateLimited(username)) {
            return ChatResponse.error("Rate limit exceeded. Maximum 20 messages per minute permitted.");
        }

        // 2. Prepare Ledger Context & Prompt
        String systemInstruction = "You are the dedicated AI Assistant embedded directly inside this Enterprise Financial Ledger application.\n" +
                "You have DIRECT, REAL-TIME ACCESS to all ledger accounts, balance sheets, trial balance reports, profit & loss statements, and transactions in the database.\n" +
                "IMPORTANT INSTRUCTIONS:\n" +
                "1. NEVER tell the user that you cannot see their data, and NEVER ask the user to enter, upload, paste, or provide their data/sheets into the chat. All live data is ALREADY provided below.\n" +
                "2. ALWAYS use the live ledger data provided below to answer questions about the ledger, accounts, balances, transactions, revenue, expenses, net profit, or sheets.\n" +
                "3. If the user asks a general or conceptual accounting question, explain clearly.\n" +
                "4. Keep answers direct, accurate, and concise in Indian Rupees (₹).";

        String ledgerContext = buildLedgerContextSummary();

        // 3. Multi-Tier Resolution:
        // Tier A: If Cloud AI API Key is provided, use Cloud AI
        if (cloudApiKey != null && !cloudApiKey.trim().isEmpty()) {
            try {
                String cloudResponse = queryCloudAi(systemInstruction, ledgerContext, userMessage);
                if (cloudResponse != null && !cloudResponse.trim().isEmpty()) {
                    return ChatResponse.success(cloudResponse);
                }
            } catch (Exception ex) {
                logger.warn("Cloud AI call failed, attempting local/fallback: {}", ex.getMessage());
            }
        }

        // Tier B: Try Local Ollama (if running on machine/server)
        try {
            String ollamaResponse = queryOllama(systemInstruction, ledgerContext, userMessage);
            if (ollamaResponse != null && !ollamaResponse.trim().isEmpty()) {
                return ChatResponse.success(ollamaResponse);
            }
        } catch (ConnectException | HttpTimeoutException ex) {
            logger.info("Ollama is not running or timed out. Falling back to built-in Ledger Intelligence Engine.");
        } catch (Exception ex) {
            logger.warn("Local Ollama unavailable: {}. Falling back to Ledger Intelligence Engine.", ex.getMessage());
        }

        // Tier C: Built-in Live Ledger Intelligence Engine (Guaranteed zero-failure production fallback)
        return answerWithLedgerIntelligence(userMessage);
    }

    private String queryOllama(String systemInstruction, String ledgerContext, String userMessage) throws Exception {
        String fullPrompt = systemInstruction + "\n\n" +
                "--- LIVE LEDGER DATABASE CONTEXT ---\n" + ledgerContext + "\n\n" +
                "User Question: " + userMessage;

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", ollamaModel);
        payload.put("prompt", fullPrompt);
        payload.put("stream", false);

        String requestBody = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ollamaApiUrl))
                .header("Content-Type", "application.json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(AI_TIMEOUT_SECONDS))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode responseNode = root.path("response");
            if (!responseNode.isMissingNode() && !responseNode.isNull()) {
                return responseNode.asText("");
            }
        }
        return null;
    }

    private String queryCloudAi(String systemInstruction, String ledgerContext, String userMessage) throws Exception {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction + "\n\n--- LIVE LEDGER CONTEXT ---\n" + ledgerContext));
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", cloudModel);
        payload.put("messages", messages);
        payload.put("temperature", 0.3);

        String requestBody = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(cloudEndpoint))
                .header("Content-Type", "application.json")
                .header("Authorization", "Bearer " + cloudApiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(AI_TIMEOUT_SECONDS))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText("");
            }
        }
        return null;
    }

    /**
     * Built-in Intelligent Financial Ledger Engine.
     * Guarantees 100% availability in cloud deployments even when no LLM server or API key is present.
     */
    private ChatResponse answerWithLedgerIntelligence(String userMessage) {
        String query = userMessage.toLowerCase().trim();

        // 1. Greetings
        if (query.matches("^(hi|hello|hey|greetings|hola|good morning|good afternoon|good evening).*") || query.equals("hi") || query.equals("hello")) {
            return ChatResponse.success("👋 Hello! I am your Ledger AI Assistant. I have direct, real-time access to your financial books and database. Ask me anything about your net profit, total revenue, operating expenses, trial balance, or recent transactions!");
        }

        // 2. Net Profit / Loss
        if (query.contains("profit") || query.contains("loss") || query.contains("net profit") || query.contains("net loss")) {
            ProfitAndLossReport pnl = reportService.getProfitAndLoss();
            String status = pnl.getNetProfit().compareTo(BigDecimal.ZERO) >= 0 ? "Net Profit" : "Net Loss";
            String marginStr = pnl.getProfitMarginPercentage() != null ? pnl.getProfitMarginPercentage() + "%" : "0%";
            return ChatResponse.success(String.format("📊 **%s Report** (%s):\n- **%s:** ₹%,.2f\n- **Total Revenue:** ₹%,.2f\n- **Total Expenses:** ₹%,.2f\n- **Net Profit Margin:** %s",
                    status, pnl.getFinancialYear() != null ? pnl.getFinancialYear() : "Current Cycle",
                    status, pnl.getNetProfit(), pnl.getTotalRevenue(), pnl.getTotalExpenses(), marginStr));
        }

        // 3. Expenses / Spending
        if (query.contains("expense") || query.contains("spending") || query.contains("cost") || query.contains("rent") || query.contains("utilities")) {
            ProfitAndLossReport pnl = reportService.getProfitAndLoss();
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("💸 **Total Operating Expenses:** ₹%,.2f\n\n**Expense Breakdown:**\n", pnl.getTotalExpenses()));
            if (pnl.getExpenses() != null && !pnl.getExpenses().isEmpty()) {
                for (var exp : pnl.getExpenses()) {
                    sb.append(String.format("- **%s:** ₹%,.2f\n", exp.getAccountName(), exp.getBalance()));
                }
            } else {
                sb.append("No recorded expenses found in this period.\n");
            }
            return ChatResponse.success(sb.toString());
        }

        // 4. Revenue / Income / Sales
        if (query.contains("revenue") || query.contains("income") || query.contains("sales") || query.contains("earnings")) {
            ProfitAndLossReport pnl = reportService.getProfitAndLoss();
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("📈 **Total Revenue:** ₹%,.2f\n\n**Revenue Sources:**\n", pnl.getTotalRevenue()));
            if (pnl.getRevenues() != null && !pnl.getRevenues().isEmpty()) {
                for (var rev : pnl.getRevenues()) {
                    sb.append(String.format("- **%s:** ₹%,.2f\n", rev.getAccountName(), rev.getBalance()));
                }
            }
            return ChatResponse.success(sb.toString());
        }

        // 5. Cash / Liquidity / Bank Position
        if (query.contains("cash") || query.contains("bank") || query.contains("liquidity")) {
            List<AccountBalance> balances = ledgerService.getAccountBalances();
            Optional<AccountBalance> cashOpt = balances.stream().filter(b -> "Cash".equalsIgnoreCase(b.getAccountName())).findFirst();
            if (cashOpt.isPresent()) {
                return ChatResponse.success(String.format("💰 **Cash Position:** Currently, your **Cash** balance is **₹%,.2f** (Total Debits: ₹%,.2f, Total Credits: ₹%,.2f).",
                        cashOpt.get().getBalance(), cashOpt.get().getTotalDebits(), cashOpt.get().getTotalCredits()));
            }
        }

        // 6. Trial Balance / Books Balance Verification
        if (query.contains("trial balance") || query.contains("balanced") || query.contains("balance sheet") || query.contains("audit")) {
            TrialBalanceReport tb = reportService.getTrialBalance();
            if (tb.isVerified()) {
                return ChatResponse.success(String.format("⚖️ **Books Verification:** The books are **PERFECTLY BALANCED**!\n- **Total Debits:** ₹%,.2f\n- **Total Credits:** ₹%,.2f\nAll debit legs exactly match credit legs according to the double-entry accounting equation.",
                        tb.getTotalDebits(), tb.getTotalCredits()));
            } else {
                return ChatResponse.success(String.format("⚠️ **Trial Balance Imbalance Detected**:\n- Total Debits: ₹%,.2f\n- Total Credits: ₹%,.2f\nPlease review recent journal entries.",
                        tb.getTotalDebits(), tb.getTotalCredits()));
            }
        }

        // 7. Recent Transactions
        if (query.contains("transaction") || query.contains("history") || query.contains("recent") || query.contains("entry") || query.contains("entries") || query.contains("log")) {
            Page<Transaction> txPage = ledgerService.getTransactions(PageRequest.of(0, 5, Sort.by("timestamp").descending()));
            StringBuilder sb = new StringBuilder("📝 **Latest Journalized Transactions:**\n\n");
            for (Transaction tx : txPage.getContent()) {
                sb.append(String.format("- **TX #%d** [%s]: %s\n", tx.getId(), tx.getTimestamp().toString().substring(0, 16), tx.getDescription()));
            }
            return ChatResponse.success(sb.toString());
        }

        // 8. Accounting Concepts (Double Entry)
        if (query.contains("double entry") || query.contains("how does") || query.contains("explain") || query.contains("what is")) {
            return ChatResponse.success("📚 **Double-Entry Bookkeeping:**\nEvery financial event is recorded in at least two accounts (one Debit and one Credit). The fundamental accounting equation is:\n\n**Assets = Liabilities + Equity + (Revenue − Expenses)**\n\nIn this system, debits must strictly equal credits before any transaction can be posted, preventing unbalanced accounting errors.");
        }

        // 9. Comprehensive Financial Health Overview Fallback
        ProfitAndLossReport pnl = reportService.getProfitAndLoss();
        BalanceSheetReport bs = reportService.getBalanceSheet();
        BigDecimal cashBal = bs.getAssets().stream().filter(a -> "Cash".equalsIgnoreCase(a.getAccountName())).map(AccountBalanceRow::getBalance).findFirst().orElse(BigDecimal.ZERO);

        return ChatResponse.success(String.format(
                "📋 **Financial Ledger Health Overview:**\n" +
                "- **Cash Balance:** ₹%,.2f\n" +
                "- **Total Assets:** ₹%,.2f\n" +
                "- **Total Revenue:** ₹%,.2f\n" +
                "- **Total Operating Expenses:** ₹%,.2f\n" +
                "- **Net Profit / Loss:** ₹%,.2f\n" +
                "- **Books Structurally Balanced:** %s\n\n" +
                "You can ask me specific questions such as *'What is my net profit?'*, *'How much did we spend on rent?'*, or *'Show recent transactions'*.",
                cashBal,
                bs.getTotalAssets(),
                pnl.getTotalRevenue(),
                pnl.getTotalExpenses(),
                pnl.getNetProfit(),
                bs.isBalanced() ? "✅ YES" : "❌ NO"
        ));
    }

    private boolean isRateLimited(String username) {
        long now = System.currentTimeMillis();
        rateLimitMap.compute(username, (user, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayList<>();
            }
            timestamps.removeIf(ts -> now - ts > ONE_MINUTE_MS);
            return timestamps;
        });

        List<Long> timestamps = rateLimitMap.get(username);
        if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
            return true;
        }

        timestamps.add(now);
        return false;
    }

    private String buildLedgerContextSummary() {
        StringBuilder sb = new StringBuilder();
        try {
            // Account Balances
            List<AccountBalance> balances = ledgerService.getAccountBalances();
            sb.append("ACCOUNT BALANCES & TYPES:\n");
            for (AccountBalance b : balances) {
                sb.append(String.format("- %s (%s): Debits = ₹%s, Credits = ₹%s, Net Balance = ₹%s\n",
                        b.getAccountName(), b.getAccountType(),
                        b.getTotalDebits(), b.getTotalCredits(), b.getBalance()));
            }

            // Trial Balance Summary
            TrialBalanceReport trialReport = reportService.getTrialBalance();
            sb.append("\nTRIAL BALANCE SHEET:\n");
            sb.append(String.format("- Total Debits: ₹%s\n", trialReport.getTotalDebits()));
            sb.append(String.format("- Total Credits: ₹%s\n", trialReport.getTotalCredits()));
            sb.append(String.format("- Verified In Balance: %s\n", trialReport.isVerified() ? "YES" : "NO"));

            // Profit & Loss Summary
            ProfitAndLossReport pnl = reportService.getProfitAndLoss();
            sb.append("\nPROFIT & LOSS STATEMENT:\n");
            sb.append(String.format("- Total Revenue: ₹%s\n", pnl.getTotalRevenue()));
            sb.append(String.format("- Total Expenses: ₹%s\n", pnl.getTotalExpenses()));
            sb.append(String.format("- Net Profit: ₹%s\n", pnl.getNetProfit()));

            // Recent Transactions
            Page<Transaction> txPage = ledgerService.getTransactions(PageRequest.of(0, 10, Sort.by("timestamp").descending()));
            sb.append("\nRECORDED TRANSACTIONS (Latest 10):\n");
            for (Transaction tx : txPage.getContent()) {
                sb.append(String.format("- Tx #%d [%s]: \"%s\"\n", tx.getId(), tx.getTimestamp(), tx.getDescription()));
            }

        } catch (Exception e) {
            logger.warn("Could not retrieve full ledger context summary: ", e);
            sb.append("Note: Partial context retrieved due to lookup error.");
        }
        return sb.toString();
    }
}

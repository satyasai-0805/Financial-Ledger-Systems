package com.ledger.service;

import com.ledger.model.*;
import com.ledger.repository.AccountRepository;
import com.ledger.repository.JournalEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final AccountRepository accountRepository;
    private final JournalEntryRepository journalEntryRepository;

    @Autowired
    public ReportService(AccountRepository accountRepository,
                         JournalEntryRepository journalEntryRepository) {
        this.accountRepository = accountRepository;
        this.journalEntryRepository = journalEntryRepository;
    }

    /**
     * Trial Balance: shows the net debit or credit balance for every account.
     * The sum of all debit balances must equal the sum of all credit balances to
     * confirm the books are mathematically in balance.
     */
    public TrialBalanceReport getTrialBalance() {
        List<Account> accounts = accountRepository.findAll();
        List<JournalEntry> allEntries = journalEntryRepository.findAllWithAccountAndTransaction();

        List<AccountBalanceRow> rows = accounts.stream().map(account -> {
            BigDecimal totalDebits = allEntries.stream()
                    .filter(e -> e.getAccount().getId().equals(account.getId()) && "DEBIT".equals(e.getType()))
                    .map(JournalEntry::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal totalCredits = allEntries.stream()
                    .filter(e -> e.getAccount().getId().equals(account.getId()) && "CREDIT".equals(e.getType()))
                    .map(JournalEntry::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal balance = totalDebits.subtract(totalCredits).abs().setScale(2, RoundingMode.HALF_UP);

            BigDecimal debitCol;
            BigDecimal creditCol;
            boolean isDebitNormal = "ASSET".equals(account.getType()) || "EXPENSE".equals(account.getType());
            if (isDebitNormal) {
                debitCol = totalDebits.subtract(totalCredits).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                creditCol = totalCredits.subtract(totalDebits).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            } else {
                creditCol = totalCredits.subtract(totalDebits).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                debitCol = totalDebits.subtract(totalCredits).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            }

            return new AccountBalanceRow(account.getId(), account.getName(), account.getType(),
                    debitCol, creditCol, balance);
        }).collect(Collectors.toList());

        BigDecimal totalDebitCol = rows.stream().map(AccountBalanceRow::getDebit)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCreditCol = rows.stream().map(AccountBalanceRow::getCredit)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        boolean verified = totalDebitCol.compareTo(totalCreditCol) == 0;

        return new TrialBalanceReport(rows, totalDebitCol, totalCreditCol, verified);
    }

    /**
     * Profit & Loss Statement (All Time / Default)
     */
    public ProfitAndLossReport getProfitAndLoss() {
        return getProfitAndLoss(null, null);
    }

    /**
     * Profit & Loss Statement with Optional Date Range Filtering
     */
    public ProfitAndLossReport getProfitAndLoss(LocalDate startDate, LocalDate endDate) {
        List<Account> accounts = accountRepository.findAll();
        List<JournalEntry> entries;

        if (startDate != null && endDate != null) {
            LocalDateTime startDateTime = startDate.atStartOfDay();
            LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);
            entries = journalEntryRepository.findEntriesBetween(startDateTime, endDateTime);
        } else if (startDate != null) {
            LocalDateTime startDateTime = startDate.atStartOfDay();
            entries = journalEntryRepository.findEntriesBetween(startDateTime, LocalDateTime.now().plusYears(100));
        } else if (endDate != null) {
            LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);
            entries = journalEntryRepository.findEntriesAsOf(endDateTime);
        } else {
            entries = journalEntryRepository.findAllWithAccountAndTransaction();
        }

        List<AccountBalanceRow> revenues = accounts.stream()
                .filter(a -> "REVENUE".equals(a.getType()))
                .map(a -> buildRow(a, entries))
                .collect(Collectors.toList());

        List<AccountBalanceRow> expenses = accounts.stream()
                .filter(a -> "EXPENSE".equals(a.getType()))
                .map(a -> buildRow(a, entries))
                .collect(Collectors.toList());

        // Revenue normal balance = Credits - Debits
        BigDecimal totalRevenue = revenues.stream().map(AccountBalanceRow::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        // Expense normal balance = Debits - Credits
        BigDecimal totalExpenses = expenses.stream().map(AccountBalanceRow::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal netProfit = totalRevenue.subtract(totalExpenses).setScale(2, RoundingMode.HALF_UP);

        // Calculate Profit Margin Percentage: (netProfit / totalRevenue) * 100
        BigDecimal profitMarginPercentage = BigDecimal.ZERO;
        if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            profitMarginPercentage = netProfit
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalRevenue, 2, RoundingMode.HALF_UP);
        }

        String financialYear = deriveFinancialYear(startDate, endDate);

        return new ProfitAndLossReport(
                revenues,
                expenses,
                totalRevenue,
                totalExpenses,
                netProfit,
                startDate,
                endDate,
                financialYear,
                "INR",
                profitMarginPercentage
        );
    }

    /**
     * Balance Sheet (Default / As of Today)
     */
    public BalanceSheetReport getBalanceSheet() {
        return getBalanceSheet(null);
    }

    /**
     * Balance Sheet as of a specific date
     */
    public BalanceSheetReport getBalanceSheet(LocalDate asOfDate) {
        List<Account> accounts = accountRepository.findAll();
        List<JournalEntry> entries;

        if (asOfDate != null) {
            entries = journalEntryRepository.findEntriesAsOf(asOfDate.atTime(LocalTime.MAX));
        } else {
            entries = journalEntryRepository.findAllWithAccountAndTransaction();
        }

        List<AccountBalanceRow> assets = accounts.stream()
                .filter(a -> "ASSET".equals(a.getType()))
                .map(a -> buildRow(a, entries))
                .collect(Collectors.toList());

        List<AccountBalanceRow> liabilities = accounts.stream()
                .filter(a -> "LIABILITY".equals(a.getType()))
                .map(a -> buildRow(a, entries))
                .collect(Collectors.toList());

        List<AccountBalanceRow> equities = accounts.stream()
                .filter(a -> "EQUITY".equals(a.getType()))
                .map(a -> buildRow(a, entries))
                .collect(Collectors.toList());

        // Retrieve net profit up to this point as retained earnings
        ProfitAndLossReport pnl = getProfitAndLoss(null, asOfDate);
        BigDecimal netProfit = pnl.getNetProfit();

        // Total Assets
        BigDecimal totalAssets = assets.stream().map(AccountBalanceRow::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        // Total Liabilities
        BigDecimal totalLiabilities = liabilities.stream().map(AccountBalanceRow::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        // Total Equity
        BigDecimal totalEquity = equities.stream().map(AccountBalanceRow::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalLiabilitiesAndEquity = totalLiabilities.add(totalEquity).add(netProfit)
                .setScale(2, RoundingMode.HALF_UP);

        boolean balanced = totalAssets.compareTo(totalLiabilitiesAndEquity) == 0;

        return new BalanceSheetReport(assets, liabilities, equities, netProfit,
                totalAssets, totalLiabilitiesAndEquity, balanced, asOfDate, "INR");
    }

    /**
     * Export Profit & Loss Report as standard CSV content
     */
    public byte[] generateProfitAndLossCsv(ProfitAndLossReport pnl) {
        StringBuilder csv = new StringBuilder();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        csv.append("FINANCIAL LEDGER SYSTEM - PROFIT & LOSS REPORT\n");
        csv.append("Financial Year,").append(pnl.getFinancialYear() != null ? pnl.getFinancialYear() : "All Time").append("\n");
        csv.append("Period Start,").append(pnl.getStartDate() != null ? pnl.getStartDate() : "Beginning").append("\n");
        csv.append("Period End,").append(pnl.getEndDate() != null ? pnl.getEndDate() : "Present").append("\n");
        csv.append("Currency,").append(pnl.getCurrency()).append("\n");
        csv.append("Generated At,").append(pnl.getGeneratedAt() != null ? pnl.getGeneratedAt().format(dtf) : "").append("\n\n");

        csv.append("Category,Account ID,Account Name,Amount (INR)\n");

        // Revenues
        csv.append("--- REVENUES ---\n");
        for (AccountBalanceRow rev : pnl.getRevenues()) {
            csv.append("REVENUE,").append(rev.getAccountId()).append(",\"")
               .append(rev.getAccountName()).append("\",")
               .append(rev.getBalance()).append("\n");
        }
        csv.append("TOTAL REVENUE,,,").append(pnl.getTotalRevenue()).append("\n\n");

        // Expenses
        csv.append("--- EXPENSES ---\n");
        for (AccountBalanceRow exp : pnl.getExpenses()) {
            csv.append("EXPENSE,").append(exp.getAccountId()).append(",\"")
               .append(exp.getAccountName()).append("\",")
               .append(exp.getBalance()).append("\n");
        }
        csv.append("TOTAL EXPENSES,,,").append(pnl.getTotalExpenses()).append("\n\n");

        // Summary
        csv.append("--- PROFITABILITY SUMMARY ---\n");
        csv.append("NET PROFIT / LOSS,,,").append(pnl.getNetProfit()).append("\n");
        csv.append("NET PROFIT MARGIN (%),,,").append(pnl.getProfitMarginPercentage() != null ? pnl.getProfitMarginPercentage() + "%" : "0%").append("\n");

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String deriveFinancialYear(LocalDate start, LocalDate end) {
        if (start == null && end == null) {
            LocalDate now = LocalDate.now();
            int currentYear = now.getYear();
            if (now.getMonthValue() < 4) {
                return "FY " + (currentYear - 1) + "-" + currentYear;
            } else {
                return "FY " + currentYear + "-" + (currentYear + 1);
            }
        }
        if (start != null && end != null) {
            return "Period: " + start + " to " + end;
        }
        return "Custom Period";
    }

    private AccountBalanceRow buildRow(Account account, List<JournalEntry> entries) {
        BigDecimal totalDebits = entries.stream()
                .filter(e -> e.getAccount().getId().equals(account.getId()) && "DEBIT".equals(e.getType()))
                .map(JournalEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalCredits = entries.stream()
                .filter(e -> e.getAccount().getId().equals(account.getId()) && "CREDIT".equals(e.getType()))
                .map(JournalEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal balance;
        boolean isDebitNormal = "ASSET".equals(account.getType()) || "EXPENSE".equals(account.getType());
        if (isDebitNormal) {
            balance = totalDebits.subtract(totalCredits).setScale(2, RoundingMode.HALF_UP);
        } else {
            balance = totalCredits.subtract(totalDebits).setScale(2, RoundingMode.HALF_UP);
        }

        return new AccountBalanceRow(account.getId(), account.getName(), account.getType(),
                totalDebits, totalCredits, balance);
    }
}

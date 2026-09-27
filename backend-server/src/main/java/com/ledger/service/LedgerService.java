package com.ledger.service;

import com.ledger.model.Account;
import com.ledger.model.JournalEntry;
import com.ledger.model.Transaction;
import com.ledger.model.AccountBalance;
import com.ledger.repository.AccountRepository;
import com.ledger.repository.TransactionRepository;
import com.ledger.repository.JournalEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LedgerService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final JournalEntryRepository journalEntryRepository;

    @Autowired
    public LedgerService(TransactionRepository transactionRepository, AccountRepository accountRepository, JournalEntryRepository journalEntryRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.journalEntryRepository = journalEntryRepository;
    }

    public Page<Transaction> getTransactions(Pageable pageable) {
        return transactionRepository.findAll(pageable);
    }

    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    public Account createAccount(Account account) {
        if (account.getName() == null || account.getName().trim().isEmpty()) {
            throw new InvalidTransactionException("Account name cannot be empty");
        }
        if (accountRepository.findByName(account.getName()).isPresent()) {
            throw new InvalidTransactionException("Account with name '" + account.getName() + "' already exists");
        }
        return accountRepository.save(account);
    }

    public Transaction createTransaction(Transaction transaction) {
        if (transaction.getDescription() == null || transaction.getDescription().trim().isEmpty()) {
            throw new InvalidTransactionException("Transaction description cannot be empty");
        }

        List<JournalEntry> entries = transaction.getEntries();
        if (entries == null || entries.size() < 2) {
            throw new InvalidTransactionException("A transaction must contain at least two journal entry lines");
        }

        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (JournalEntry entry : entries) {
            // Check Account
            if (entry.getAccount() == null || (entry.getAccount().getId() == null && entry.getAccount().getName() == null)) {
                throw new InvalidTransactionException("Each journal entry must reference a valid account");
            }

            Account account;
            if (entry.getAccount().getId() != null) {
                account = accountRepository.findById(entry.getAccount().getId())
                        .orElseThrow(() -> new InvalidTransactionException("Account not found with ID: " + entry.getAccount().getId()));
            } else {
                account = accountRepository.findByName(entry.getAccount().getName())
                        .orElseThrow(() -> new InvalidTransactionException("Account not found with name: " + entry.getAccount().getName()));
            }
            entry.setAccount(account);

            // Check Amount
            BigDecimal amount = entry.getAmount();
            if (amount == null) {
                throw new InvalidTransactionException("Amount cannot be null");
            }
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new InvalidTransactionException("Amount must be greater than zero. Positive values only.");
            }

            // Normalise scale for display/processing consistency
            amount = amount.setScale(2, RoundingMode.HALF_UP);
            entry.setAmount(amount);

            // Check Type
            String type = entry.getType();
            if (type == null) {
                throw new InvalidTransactionException("Journal entry type must be specified");
            }

            if ("DEBIT".equalsIgnoreCase(type)) {
                totalDebits = totalDebits.add(amount);
                entry.setType("DEBIT");
            } else if ("CREDIT".equalsIgnoreCase(type)) {
                totalCredits = totalCredits.add(amount);
                entry.setType("CREDIT");
            } else {
                throw new InvalidTransactionException("Invalid journal entry type: '" + type + "'. Must be DEBIT or CREDIT.");
            }

            // Establish bi-directional link
            entry.setTransaction(transaction);
        }

        // Compare Total Debits vs Credits
        totalDebits = totalDebits.setScale(2, RoundingMode.HALF_UP);
        totalCredits = totalCredits.setScale(2, RoundingMode.HALF_UP);

        if (totalDebits.compareTo(totalCredits) != 0) {
            BigDecimal difference = totalDebits.subtract(totalCredits).abs();
            throw new InvalidTransactionException(
                    String.format("Double-entry validation failed: Total Debits (₹%s) must equal Total Credits (₹%s). Difference: ₹%s",
                            totalDebits.toPlainString(), totalCredits.toPlainString(), difference.toPlainString())
            );
        }

        LocalDateTime txTimestamp = transaction.getTimestamp();
        if (txTimestamp == null) {
            txTimestamp = LocalDateTime.now();
            transaction.setTimestamp(txTimestamp);
        }

        // Validate Indian Financial Year (April 1 to March 31 of next year)
        LocalDateTime now = LocalDateTime.now();
        int fyStartYear = (now.getMonthValue() >= 4) ? now.getYear() : now.getYear() - 1;
        LocalDateTime fyStart = LocalDateTime.of(fyStartYear, 4, 1, 0, 0, 0);
        LocalDateTime fyEnd = LocalDateTime.of(fyStartYear + 1, 3, 31, 23, 59, 59, 999999999);

        if (txTimestamp.isBefore(fyStart) || txTimestamp.isAfter(fyEnd)) {
            throw new InvalidTransactionException("Cannot post entries to a closed financial year period.");
        }

        // Save to the relational file database
        Transaction savedTransaction = transactionRepository.save(transaction);

        // Append to the clean human-readable log file
        writeToReadableLogFile(savedTransaction);

        return savedTransaction;
    }

    /**
     * Appends a clean, formatted text snapshot of the transaction into a txt file.
     */
    private void writeToReadableLogFile(Transaction tx) {
        String fileName = "../database-server/data/readable_ledger_history.txt";
        java.io.File file = new java.io.File(fileName);
        if (file.getParentFile() != null) {
            file.getParentFile().mkdirs();
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
        
        try (FileWriter fw = new FileWriter(file, true);
             PrintWriter pw = new PrintWriter(fw)) {
             
            pw.println("========================================================================");
            pw.println("TRANSACTION ID : " + tx.getId());
            pw.println("DATE & TIME    : " + tx.getTimestamp().format(formatter));
            pw.println("NARRATION      : " + tx.getDescription());
            pw.println("JOURNAL ENTRIES:");
            pw.println("------------------------------------------------------------------------");
            
            for (JournalEntry entry : tx.getEntries()) {
                pw.printf("   %-30s | %-8s | ₹ %s%n", 
                        entry.getAccount().getName(), 
                        entry.getType(), 
                        entry.getAmount().toPlainString());
            }
            pw.println("========================================================================");
            pw.println(); // Extra line break for spacing out logs
            
        } catch (IOException e) {
            System.err.println("CRITICAL: Failed to write transaction log to text file: " + e.getMessage());
        }
    }

    /**
     * Computes totals (debits, credits) and current balances for all accounts.
     */
    public List<AccountBalance> getAccountBalances() {
        List<Account> accounts = accountRepository.findAll();
        List<JournalEntry> allEntries = journalEntryRepository.findAll();
        
        return accounts.stream().map(account -> {
            BigDecimal debits = allEntries.stream()
                    .filter(e -> e.getAccount().getId().equals(account.getId()) && "DEBIT".equals(e.getType()))
                    .map(JournalEntry::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
            BigDecimal credits = allEntries.stream()
                    .filter(e -> e.getAccount().getId().equals(account.getId()) && "CREDIT".equals(e.getType()))
                    .map(JournalEntry::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
            BigDecimal balance;
            // Asset and Expense accounts have Debit normal balances: Balance = Debit - Credit
            // Liability, Equity, and Revenue accounts have Credit normal balances: Balance = Credit - Debit
            if ("ASSET".equals(account.getType()) || "EXPENSE".equals(account.getType())) {
                balance = debits.subtract(credits);
            } else {
                balance = credits.subtract(debits);
            }
            
            return new AccountBalance(
                    account.getId(),
                    account.getName(),
                    account.getType(),
                    debits,
                    credits,
                    balance
            );
        }).collect(Collectors.toList());
    }
}
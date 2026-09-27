package com.ledger.config;

import com.ledger.model.Account;
import com.ledger.model.JournalEntry;
import com.ledger.model.Role;
import com.ledger.model.Transaction;
import com.ledger.model.User;
import com.ledger.repository.AccountRepository;
import com.ledger.repository.UserRepository;
import com.ledger.service.LedgerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@Order(2)
public class DataSeeder implements CommandLineRunner {

    private final LedgerService ledgerService;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataSeeder(LedgerService ledgerService, AccountRepository accountRepository,
                      UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.ledgerService = ledgerService;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Only seed if database is empty
        if (accountRepository.count() == 0) {
            System.out.println("No accounts found. Seeding initial double-entry ledger data...");

            // 1. Seed Accounts
            Account cash = new Account(1000L, "Cash", "ASSET");
            Account accountsReceivable = new Account(1200L, "Accounts Receivable", "ASSET");
            Account accountsPayable = new Account(2000L, "Accounts Payable", "LIABILITY");
            Account revenue = new Account(4000L, "Revenue", "REVENUE");
            Account rentExpense = new Account(5000L, "Rent Expense", "EXPENSE");
            Account utilitiesExpense = new Account(5100L, "Utilities Expense", "EXPENSE");

            ledgerService.createAccount(cash);
            ledgerService.createAccount(accountsReceivable);
            ledgerService.createAccount(accountsPayable);
            ledgerService.createAccount(revenue);
            ledgerService.createAccount(rentExpense);
            ledgerService.createAccount(utilitiesExpense);

            System.out.println("Basic accounts seeded successfully.");

            // 2. Seed 5 Perfectly Balanced Historical Transactions
            LocalDateTime now = LocalDateTime.now();

            // Transaction 1: Owner Capital/Revenue Injection (5 days ago)
            Transaction t1 = new Transaction("Initial Cash Investment", now.minusDays(5));
            t1.addEntry(new JournalEntry(cash, "DEBIT", new BigDecimal("15000.00")));
            t1.addEntry(new JournalEntry(revenue, "CREDIT", new BigDecimal("15000.00")));
            ledgerService.createTransaction(t1);

            // Transaction 2: Rendered Consulting Services to Client on Credit (4 days ago)
            Transaction t2 = new Transaction("Consulting Services Rendered - Client Billed", now.minusDays(4));
            t2.addEntry(new JournalEntry(accountsReceivable, "DEBIT", new BigDecimal("4500.00")));
            t2.addEntry(new JournalEntry(revenue, "CREDIT", new BigDecimal("4500.00")));
            ledgerService.createTransaction(t2);

            // Transaction 3: Received Rent Invoice from Landlord (3 days ago)
            Transaction t3 = new Transaction("Monthly Office Rent Invoice", now.minusDays(3));
            t3.addEntry(new JournalEntry(rentExpense, "DEBIT", new BigDecimal("1200.00")));
            t3.addEntry(new JournalEntry(accountsPayable, "CREDIT", new BigDecimal("1200.00")));
            ledgerService.createTransaction(t3);

            // Transaction 4: Received partial payment from client for services (2 days ago)
            Transaction t4 = new Transaction("Client Invoice Payment Received", now.minusDays(2));
            t4.addEntry(new JournalEntry(cash, "DEBIT", new BigDecimal("2500.00")));
            t4.addEntry(new JournalEntry(accountsReceivable, "CREDIT", new BigDecimal("2500.00")));
            ledgerService.createTransaction(t4);

            // Transaction 5: Paid rent invoice to Landlord (1 day ago)
            Transaction t5 = new Transaction("Rent Payment to Vendor", now.minusDays(1));
            t5.addEntry(new JournalEntry(accountsPayable, "DEBIT", new BigDecimal("1200.00")));
            t5.addEntry(new JournalEntry(cash, "CREDIT", new BigDecimal("1200.00")));
            ledgerService.createTransaction(t5);

            System.out.println("5 balanced historical transactions seeded successfully.");
        } else {
            System.out.println("Database already contains accounts. Skipping ledger seeding step.");
        }

        // Seed users if empty
        if (userRepository.count() == 0) {
            System.out.println("No users found. Seeding default ADMIN and VIEWER accounts...");
            
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole(Role.ROLE_ADMIN);
            userRepository.save(admin);

            User viewer = new User();
            viewer.setUsername("viewer");
            viewer.setPassword(passwordEncoder.encode("viewer"));
            viewer.setRole(Role.ROLE_VIEWER);
            userRepository.save(viewer);

            System.out.println("Default users seeded: admin/admin, viewer/viewer");
        } else {
            System.out.println("Database already contains users. Skipping user seeding step.");
        }
    }
}

package com.ledger.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
@Order(1)
public class DatabaseMigrator implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DatabaseMigrator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // Check if accounts already exist in PostgreSQL database
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM accounts", Integer.class);
        if (count != null && count > 0) {
            System.out.println("PostgreSQL database already has accounts. Skipping migration.");
            return;
        }

        System.out.println("Starting data migration from H2 to PostgreSQL...");
        
        java.io.File h2File = new java.io.File("../database-server/data/ledgerdb.mv.db");
        System.out.println("Current working directory: " + System.getProperty("user.dir"));
        System.out.println("H2 file absolute path: " + h2File.getAbsolutePath());
        System.out.println("H2 file exists: " + h2File.exists());

        String h2Url = "jdbc:h2:file:../database-server/data/ledgerdb;MODE=Oracle";
        String h2User = "sa";
        String h2Password = "";

        // Explicitly load H2 driver
        try {
            Class.forName("org.h2.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("H2 JDBC Driver not found on classpath!");
            return;
        }

        // Attempt to connect to H2
        try (Connection h2Conn = DriverManager.getConnection(h2Url, h2User, h2Password)) {
            System.out.println("Connected to H2 source database.");

            try (Statement stmt = h2Conn.createStatement()) {
                // List H2 tables
                try (ResultSet rs = stmt.executeQuery("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES")) {
                    System.out.print("H2 Tables found: ");
                    while (rs.next()) {
                        System.out.print(rs.getString("TABLE_NAME") + " ");
                    }
                    System.out.println();
                } catch (Exception e) {
                    System.out.println("Could not query H2 tables: " + e.getMessage());
                }

                // Check if accounts table exists in H2 and has data
                boolean hasH2Data = false;
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM ACCOUNTS")) {
                    if (rs.next()) {
                        long countAccounts = rs.getLong(1);
                        hasH2Data = countAccounts > 0;
                    }
                } catch (Exception e) {
                    System.out.println("H2 database ACCOUNTS table check failed: " + e.getMessage());
                }

                if (!hasH2Data) {
                    System.out.println("No data found in H2 database ACCOUNTS table. Skipping migration.");
                    return;
                }

                System.out.println("Migrating accounts...");
                try (ResultSet rs = stmt.executeQuery("SELECT ID, NAME, TYPE FROM ACCOUNTS")) {
                    while (rs.next()) {
                        long id = rs.getLong("ID");
                        long mappedId = mapOldIdToGlCode(id);
                        String name = rs.getString("NAME");
                        String type = rs.getString("TYPE");
                        jdbcTemplate.update("INSERT INTO accounts (id, name, type) VALUES (?, ?, ?)", mappedId, name, type);
                    }
                }
                System.out.println("Accounts migrated.");

                System.out.println("Migrating transactions...");
                try (ResultSet rs = stmt.executeQuery("SELECT ID, DESCRIPTION, TIMESTAMP FROM TRANSACTIONS")) {
                    while (rs.next()) {
                        long id = rs.getLong("ID");
                        String description = rs.getString("DESCRIPTION");
                        java.sql.Timestamp timestamp = rs.getTimestamp("TIMESTAMP");
                        jdbcTemplate.update("INSERT INTO transactions (id, description, timestamp) VALUES (?, ?, ?)", id, description, timestamp);
                    }
                }
                System.out.println("Transactions migrated.");

                System.out.println("Migrating journal entries...");
                try (ResultSet rs = stmt.executeQuery("SELECT ID, AMOUNT, TYPE, ACCOUNT_ID, TRANSACTION_ID FROM JOURNAL_ENTRIES")) {
                    while (rs.next()) {
                        long id = rs.getLong("ID");
                        java.math.BigDecimal amount = rs.getBigDecimal("AMOUNT");
                        String type = rs.getString("TYPE");
                        long accountId = rs.getLong("ACCOUNT_ID");
                        long mappedAccountId = mapOldIdToGlCode(accountId);
                        long transactionId = rs.getLong("TRANSACTION_ID");
                        jdbcTemplate.update("INSERT INTO journal_entries (id, amount, type, account_id, transaction_id) VALUES (?, ?, ?, ?, ?)",
                                id, amount, type, mappedAccountId, transactionId);
                    }
                }
                System.out.println("Journal entries migrated.");

                // Reset identity/serial sequences in PostgreSQL
                System.out.println("Resetting sequence counters in PostgreSQL...");
                jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('transactions', 'id'), coalesce((SELECT max(id) FROM transactions), 1))");
                jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('journal_entries', 'id'), coalesce((SELECT max(id) FROM journal_entries), 1))");
                System.out.println("Sequence counters reset.");

                System.out.println("Data migration completed successfully!");
            }
        } catch (Exception e) {
            System.err.println("Migration failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private long mapOldIdToGlCode(long oldId) {
        if (oldId == 1) return 1000L; // Cash
        if (oldId == 2) return 1200L; // Accounts Receivable
        if (oldId == 3) return 2000L; // Accounts Payable
        if (oldId == 4) return 4000L; // Revenue
        if (oldId == 5) return 5000L; // Rent Expense
        if (oldId == 6) return 5100L; // Utilities Expense
        return oldId;
    }
}

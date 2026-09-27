package com.ledger.model;

import java.math.BigDecimal;

public class AccountBalance {
    private Long accountId;
    private String accountName;
    private String accountType;
    private BigDecimal totalDebits;
    private BigDecimal totalCredits;
    private BigDecimal balance;

    public AccountBalance() {
    }

    public AccountBalance(Long accountId, String accountName, String accountType, BigDecimal totalDebits, BigDecimal totalCredits, BigDecimal balance) {
        this.accountId = accountId;
        this.accountName = accountName;
        this.accountType = accountType;
        this.totalDebits = totalDebits;
        this.totalCredits = totalCredits;
        this.balance = balance;
    }

    // Getters and Setters
    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public BigDecimal getTotalDebits() {
        return totalDebits;
    }

    public void setTotalDebits(BigDecimal totalDebits) {
        this.totalDebits = totalDebits;
    }

    public BigDecimal getTotalCredits() {
        return totalCredits;
    }

    public void setTotalCredits(BigDecimal totalCredits) {
        this.totalCredits = totalCredits;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }
}

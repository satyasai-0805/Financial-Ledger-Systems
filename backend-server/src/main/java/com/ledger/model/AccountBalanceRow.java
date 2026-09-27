package com.ledger.model;

import java.math.BigDecimal;

public class AccountBalanceRow {

    private Long accountId;
    private String accountName;
    private String accountType;
    private BigDecimal debit;
    private BigDecimal credit;
    private BigDecimal balance;

    public AccountBalanceRow() {}

    public AccountBalanceRow(Long accountId, String accountName, String accountType,
                             BigDecimal debit, BigDecimal credit, BigDecimal balance) {
        this.accountId = accountId;
        this.accountName = accountName;
        this.accountType = accountType;
        this.debit = debit;
        this.credit = credit;
        this.balance = balance;
    }

    public Long getAccountId() { return accountId; }
    public void setAccountId(Long accountId) { this.accountId = accountId; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit; }

    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}

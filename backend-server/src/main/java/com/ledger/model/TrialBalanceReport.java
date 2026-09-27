package com.ledger.model;

import java.math.BigDecimal;
import java.util.List;

public class TrialBalanceReport {

    private List<AccountBalanceRow> rows;
    private BigDecimal totalDebits;
    private BigDecimal totalCredits;
    private boolean verified;

    public TrialBalanceReport() {}

    public TrialBalanceReport(List<AccountBalanceRow> rows, BigDecimal totalDebits,
                              BigDecimal totalCredits, boolean verified) {
        this.rows = rows;
        this.totalDebits = totalDebits;
        this.totalCredits = totalCredits;
        this.verified = verified;
    }

    public List<AccountBalanceRow> getRows() { return rows; }
    public void setRows(List<AccountBalanceRow> rows) { this.rows = rows; }

    public BigDecimal getTotalDebits() { return totalDebits; }
    public void setTotalDebits(BigDecimal totalDebits) { this.totalDebits = totalDebits; }

    public BigDecimal getTotalCredits() { return totalCredits; }
    public void setTotalCredits(BigDecimal totalCredits) { this.totalCredits = totalCredits; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
}

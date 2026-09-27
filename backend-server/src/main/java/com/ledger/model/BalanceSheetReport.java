package com.ledger.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BalanceSheetReport {

    private List<AccountBalanceRow> assets;
    private List<AccountBalanceRow> liabilities;
    private List<AccountBalanceRow> equities;
    private BigDecimal netProfit;
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilitiesAndEquity;
    private boolean balanced;

    // Metadata
    private LocalDateTime generatedAt;
    private LocalDate asOfDate;
    private String currency = "INR";

    public BalanceSheetReport() {
        this.generatedAt = LocalDateTime.now();
    }

    public BalanceSheetReport(List<AccountBalanceRow> assets, List<AccountBalanceRow> liabilities,
                              List<AccountBalanceRow> equities, BigDecimal netProfit,
                              BigDecimal totalAssets, BigDecimal totalLiabilitiesAndEquity,
                              boolean balanced) {
        this.assets = assets;
        this.liabilities = liabilities;
        this.equities = equities;
        this.netProfit = netProfit;
        this.totalAssets = totalAssets;
        this.totalLiabilitiesAndEquity = totalLiabilitiesAndEquity;
        this.balanced = balanced;
        this.generatedAt = LocalDateTime.now();
    }

    public BalanceSheetReport(List<AccountBalanceRow> assets, List<AccountBalanceRow> liabilities,
                              List<AccountBalanceRow> equities, BigDecimal netProfit,
                              BigDecimal totalAssets, BigDecimal totalLiabilitiesAndEquity,
                              boolean balanced, LocalDate asOfDate, String currency) {
        this.assets = assets;
        this.liabilities = liabilities;
        this.equities = equities;
        this.netProfit = netProfit;
        this.totalAssets = totalAssets;
        this.totalLiabilitiesAndEquity = totalLiabilitiesAndEquity;
        this.balanced = balanced;
        this.generatedAt = LocalDateTime.now();
        this.asOfDate = asOfDate;
        this.currency = currency != null ? currency : "INR";
    }

    public List<AccountBalanceRow> getAssets() { return assets; }
    public void setAssets(List<AccountBalanceRow> assets) { this.assets = assets; }

    public List<AccountBalanceRow> getLiabilities() { return liabilities; }
    public void setLiabilities(List<AccountBalanceRow> liabilities) { this.liabilities = liabilities; }

    public List<AccountBalanceRow> getEquities() { return equities; }
    public void setEquities(List<AccountBalanceRow> equities) { this.equities = equities; }

    public BigDecimal getNetProfit() { return netProfit; }
    public void setNetProfit(BigDecimal netProfit) { this.netProfit = netProfit; }

    public BigDecimal getTotalAssets() { return totalAssets; }
    public void setTotalAssets(BigDecimal totalAssets) { this.totalAssets = totalAssets; }

    public BigDecimal getTotalLiabilitiesAndEquity() { return totalLiabilitiesAndEquity; }
    public void setTotalLiabilitiesAndEquity(BigDecimal totalLiabilitiesAndEquity) {
        this.totalLiabilitiesAndEquity = totalLiabilitiesAndEquity;
    }

    public boolean isBalanced() { return balanced; }
    public void setBalanced(boolean balanced) { this.balanced = balanced; }

    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }

    public LocalDate getAsOfDate() { return asOfDate; }
    public void setAsOfDate(LocalDate asOfDate) { this.asOfDate = asOfDate; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
}

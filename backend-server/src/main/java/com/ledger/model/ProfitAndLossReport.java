package com.ledger.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ProfitAndLossReport {

    private List<AccountBalanceRow> revenues;
    private List<AccountBalanceRow> expenses;
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal netProfit;

    // Enterprise & Production Reporting Metadata
    private LocalDateTime generatedAt;
    private LocalDate startDate;
    private LocalDate endDate;
    private String financialYear;
    private String currency = "INR";
    private BigDecimal profitMarginPercentage;

    public ProfitAndLossReport() {
        this.generatedAt = LocalDateTime.now();
    }

    public ProfitAndLossReport(List<AccountBalanceRow> revenues, List<AccountBalanceRow> expenses,
                               BigDecimal totalRevenue, BigDecimal totalExpenses, BigDecimal netProfit) {
        this.revenues = revenues;
        this.expenses = expenses;
        this.totalRevenue = totalRevenue;
        this.totalExpenses = totalExpenses;
        this.netProfit = netProfit;
        this.generatedAt = LocalDateTime.now();
    }

    public ProfitAndLossReport(List<AccountBalanceRow> revenues, List<AccountBalanceRow> expenses,
                               BigDecimal totalRevenue, BigDecimal totalExpenses, BigDecimal netProfit,
                               LocalDate startDate, LocalDate endDate, String financialYear,
                               String currency, BigDecimal profitMarginPercentage) {
        this.revenues = revenues;
        this.expenses = expenses;
        this.totalRevenue = totalRevenue;
        this.totalExpenses = totalExpenses;
        this.netProfit = netProfit;
        this.generatedAt = LocalDateTime.now();
        this.startDate = startDate;
        this.endDate = endDate;
        this.financialYear = financialYear;
        this.currency = currency != null ? currency : "INR";
        this.profitMarginPercentage = profitMarginPercentage;
    }

    public List<AccountBalanceRow> getRevenues() { return revenues; }
    public void setRevenues(List<AccountBalanceRow> revenues) { this.revenues = revenues; }

    public List<AccountBalanceRow> getExpenses() { return expenses; }
    public void setExpenses(List<AccountBalanceRow> expenses) { this.expenses = expenses; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(BigDecimal totalExpenses) { this.totalExpenses = totalExpenses; }

    public BigDecimal getNetProfit() { return netProfit; }
    public void setNetProfit(BigDecimal netProfit) { this.netProfit = netProfit; }

    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getFinancialYear() { return financialYear; }
    public void setFinancialYear(String financialYear) { this.financialYear = financialYear; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getProfitMarginPercentage() { return profitMarginPercentage; }
    public void setProfitMarginPercentage(BigDecimal profitMarginPercentage) {
        this.profitMarginPercentage = profitMarginPercentage;
    }
}

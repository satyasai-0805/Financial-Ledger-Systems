package com.ledger.controller;

import com.ledger.model.BalanceSheetReport;
import com.ledger.model.ProfitAndLossReport;
import com.ledger.model.TrialBalanceReport;
import com.ledger.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Read-only Financial Reports Controller.
 *
 * NOTE ON AUDIT IMMUTABILITY:
 * This controller provides only GET endpoints for reporting purposes.
 * No mutation operations (POST, PUT, PATCH, DELETE) are exposed here.
 * All financial data is treated as immutable once posted through LedgerController.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    @Autowired
    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Returns the Trial Balance: net debit/credit balance for every account.
     * If totalDebits == totalCredits, the books are mathematically verified.
     */
    @GetMapping("/trial-balance")
    public ResponseEntity<TrialBalanceReport> getTrialBalance() {
        return ResponseEntity.ok(reportService.getTrialBalance());
    }

    /**
     * Returns the Profit & Loss statement:
     * Net Profit = Total Revenue - Total Expenses
     * Supports optional date filtering (?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD)
     */
    @GetMapping("/profit-loss")
    public ResponseEntity<ProfitAndLossReport> getProfitAndLoss(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getProfitAndLoss(startDate, endDate));
    }

    /**
     * Exports the Profit & Loss statement as a downloadable CSV file.
     */
    @GetMapping("/profit-loss/export-csv")
    public ResponseEntity<byte[]> exportProfitAndLossCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        ProfitAndLossReport pnl = reportService.getProfitAndLoss(startDate, endDate);
        byte[] csvData = reportService.generateProfitAndLossCsv(pnl);

        String filename = "Profit_and_Loss_Report";
        if (startDate != null && endDate != null) {
            filename += "_" + startDate + "_to_" + endDate;
        }
        filename += ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    /**
     * Returns the Balance Sheet:
     * Assets = Liabilities + Equity + Net Profit (Retained Earnings)
     * Supports optional asOfDate (?asOfDate=YYYY-MM-DD)
     */
    @GetMapping("/balance-sheet")
    public ResponseEntity<BalanceSheetReport> getBalanceSheet(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        return ResponseEntity.ok(reportService.getBalanceSheet(asOfDate));
    }
}

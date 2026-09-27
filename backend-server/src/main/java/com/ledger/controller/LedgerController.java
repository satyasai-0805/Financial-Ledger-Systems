package com.ledger.controller;

import com.ledger.model.Account;
import com.ledger.model.Transaction;
import com.ledger.model.AccountBalance;
import com.ledger.service.InvalidTransactionException;
import com.ledger.service.LedgerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller exposing endpoints for the Enterprise Financial Ledger.
 * 
 * NOTE ON AUDIT IMMUTABILITY:
 * In accordance with standard accounting principles (e.g. IAS 8 / Ind AS 8),
 * a ledger transaction cannot be modified or deleted once posted. 
 * Therefore, this controller strictly omits any PUT, PATCH, or DELETE mapping endpoints.
 * All errors must be corrected by posting a reversing or adjustment transaction.
 */
@RestController
@RequestMapping("/api")
public class LedgerController {

    private final LedgerService ledgerService;

    @Autowired
    public LedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<Transaction>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        // Order by timestamp desc to show latest transactions first
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        Page<Transaction> transactions = ledgerService.getTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }

    @PostMapping("/transactions")
    public ResponseEntity<Transaction> createTransaction(@RequestBody Transaction transaction) {
        Transaction savedTransaction = ledgerService.createTransaction(transaction);
        return new ResponseEntity<>(savedTransaction, HttpStatus.CREATED);
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<Account>> getAccounts() {
        List<Account> accounts = ledgerService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/accounts/balances")
    public ResponseEntity<List<AccountBalance>> getAccountBalances() {
        List<AccountBalance> balances = ledgerService.getAccountBalances();
        return ResponseEntity.ok(balances);
    }

    @ExceptionHandler(InvalidTransactionException.class)
    public ResponseEntity<Map<String, String>> handleInvalidTransactionException(InvalidTransactionException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
}

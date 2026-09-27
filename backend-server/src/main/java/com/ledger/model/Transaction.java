package com.ledger.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<JournalEntry> entries = new ArrayList<>();

    public Transaction() {
        this.timestamp = LocalDateTime.now();
    }

    public Transaction(String description) {
        this.description = description;
        this.timestamp = LocalDateTime.now();
    }

    public Transaction(String description, LocalDateTime timestamp) {
        this.description = description;
        this.timestamp = timestamp;
    }

    // Helper method to add entry and keep relationship sync'd
    public void addEntry(JournalEntry entry) {
        entries.add(entry);
        entry.setTransaction(this);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public List<JournalEntry> getEntries() {
        return entries;
    }

    public void setEntries(List<JournalEntry> entries) {
        this.entries = entries;
        if (entries != null) {
            for (JournalEntry entry : entries) {
                entry.setTransaction(this);
            }
        }
    }
}

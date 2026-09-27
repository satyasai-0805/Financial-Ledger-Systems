package com.ledger.repository;

import com.ledger.model.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {

    @Query("SELECT j FROM JournalEntry j JOIN FETCH j.account JOIN FETCH j.transaction t WHERE t.timestamp >= :startDate AND t.timestamp <= :endDate")
    List<JournalEntry> findEntriesBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT j FROM JournalEntry j JOIN FETCH j.account JOIN FETCH j.transaction t WHERE t.timestamp <= :asOfDate")
    List<JournalEntry> findEntriesAsOf(@Param("asOfDate") LocalDateTime asOfDate);

    @Query("SELECT j FROM JournalEntry j JOIN FETCH j.account JOIN FETCH j.transaction")
    List<JournalEntry> findAllWithAccountAndTransaction();
}

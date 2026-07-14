package com.tapha.hub.reading.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingRecordRepository extends JpaRepository<ReadingRecord, Long> {
    List<ReadingRecord> findByBookIdOrderByCreatedAtAscIdAsc(Long bookId);
    Optional<ReadingRecord> findTopByBookIdOrderByCreatedAtDescIdDesc(Long bookId);
    long countByBookId(Long bookId);
}

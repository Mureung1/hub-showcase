package com.tapha.hub.reading.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingRecordRepository extends JpaRepository<ReadingRecord, Long> {
    List<ReadingRecord> findByBookIdOrderByCreatedAtAscIdAsc(Long bookId);
    List<ReadingRecord> findByBookIdInOrderByCreatedAtAscIdAsc(List<Long> bookIds);
    Optional<ReadingRecord> findTopByBookIdOrderByCreatedAtDescIdDesc(Long bookId);
    Optional<ReadingRecord> findByIdAndBookIdAndUserId(Long id, Long bookId, Long userId);
    List<ReadingRecord> findByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtBefore(
            Long userId,
            Instant from,
            Instant to
    );
    long countByBookId(Long bookId);
}

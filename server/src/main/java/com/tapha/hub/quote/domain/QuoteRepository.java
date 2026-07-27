package com.tapha.hub.quote.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

    Optional<Quote> findByIdAndUserId(Long id, Long userId);

    List<Quote> findByBookIdAndUserIdOrderByCreatedAtDescIdDesc(Long bookId, Long userId);

    @Query("""
            select q from Quote q
            where q.userId = :userId
              and q.bookId in (
                  select b.id from Book b
                  where b.userId = :userId and b.status = com.tapha.hub.book.domain.BookStatus.READING
              )
            """)
    List<Quote> findEligible(@Param("userId") Long userId);
}

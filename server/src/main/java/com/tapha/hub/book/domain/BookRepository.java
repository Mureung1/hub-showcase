package com.tapha.hub.book.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    List<Book> findByUserIdAndStatusOrderByCreatedAtDescIdDesc(Long userId, BookStatus status);

    Optional<Book> findByIdAndUserId(Long id, Long userId);
}

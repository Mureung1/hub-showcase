package com.spendmate.repository;

import com.spendmate.domain.Expense;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdAndSpentAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    List<Expense> findByUserIdOrderBySpentAtDesc(Long userId, Pageable pageable);
}

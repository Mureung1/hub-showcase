package com.spendmate.service;

import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.domain.ExpenseInputType;
import com.spendmate.domain.User;
import com.spendmate.repository.ExpenseRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ExpenseService {

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public ExpenseService(ExpenseRepository expenseRepository, UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    /**
     * 영수증/캡처 없이 사용자가 직접 입력한 지출을 저장한다 (F12).
     */
    public Expense createManual(Integer amount, Category category, String memo, LocalDateTime spentAt) {
        if (amount == null || amount == 0) {
            throw new IllegalArgumentException("금액을 입력해주세요.");
        }
        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        Expense expense = new Expense(user, null, null, memo, amount,
                category != null ? category : Category.OTHER,
                spentAt != null ? spentAt : LocalDateTime.now(),
                ExpenseInputType.MANUAL);
        return expenseRepository.save(expense);
    }
}

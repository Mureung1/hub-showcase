package com.spendmate.service;

import com.spendmate.domain.Budget;
import com.spendmate.domain.User;
import com.spendmate.repository.BudgetRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;

    public record BudgetResponse(Integer amount) {}

    public BudgetService(BudgetRepository budgetRepository, UserRepository userRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
    }

    /**
     * category=null인 Budget row를 "이번 달 총예산"으로 취급한다.
     * 카테고리별 예산(F9, 선택기능)은 category를 채워서 별도 row로 저장하면 되므로 이 컨벤션과 충돌하지 않는다.
     */
    public BudgetResponse getTotal(Long userId) {
        return budgetRepository.findByUserIdAndCategoryIsNull(userId)
                .map(budget -> new BudgetResponse(budget.getAmount()))
                .orElse(new BudgetResponse(null));
    }

    public BudgetResponse setTotal(Long userId, Integer amount) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("예산은 0보다 커야 합니다.");
        }
        Budget budget = budgetRepository.findByUserIdAndCategoryIsNull(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
                    return new Budget(user, null, amount);
                });
        budget.setAmount(amount);
        Budget saved = budgetRepository.save(budget);
        return new BudgetResponse(saved.getAmount());
    }
}

package com.spendmate.service;

import com.spendmate.domain.Budget;
import com.spendmate.domain.Category;
import com.spendmate.domain.User;
import com.spendmate.repository.BudgetRepository;
import com.spendmate.repository.SubscriptionRepository;
import com.spendmate.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@SpringBootTest
@Transactional
class ExpenseServiceTest {

    private static final Long SEED_USER_ID = 1L;

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void 이번달_누적_일평균은_총지출을_경과일수로_나눈값이다() {
        int before = expenseService.getSummary("month").total();
        expenseService.createManual(20000, Category.DELIVERY, "테스트지출1", LocalDateTime.now());
        expenseService.createManual(10000, Category.CAFE, "테스트지출2", LocalDateTime.now());

        int daysElapsed = LocalDate.now().getDayOfMonth();
        double expected = (before + 30000) / (double) daysElapsed;

        double actual = expenseService.getDailyAverageThisMonth();

        assertEquals(expected, actual, 0.01);
    }

    @Test
    void 예산이_설정되지_않았으면_소진_예상일을_계산할_수_없다() {
        budgetRepository.deleteAll();

        LocalDate actual = expenseService.predictDepletionDate();

        assertNull(actual);
    }

    @Test
    void 예산에서_고정비와_누적지출을_뺀_나머지가_0이면_오늘이_소진일이다() {
        budgetRepository.deleteAll();
        subscriptionRepository.deleteAll();

        expenseService.createManual(400000, Category.SHOPPING, "소진테스트", LocalDateTime.now());

        User user = userRepository.findById(SEED_USER_ID).orElseThrow();
        budgetRepository.save(new Budget(user, null, 400000));

        LocalDate actual = expenseService.predictDepletionDate();

        assertEquals(LocalDate.now(), actual);
    }
}
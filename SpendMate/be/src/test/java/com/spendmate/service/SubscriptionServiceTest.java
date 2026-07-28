package com.spendmate.service;

import com.spendmate.domain.Subscription;
import com.spendmate.repository.SubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class SubscriptionServiceTest {

    private static final Long SEED_USER_ID = 1L;

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Test
    void 구독을_등록하면_목록에서_조회된다() {
        subscriptionService.create(SEED_USER_ID, "테스트구독", 9900, 15);

        List<SubscriptionService.SubscriptionResponse> all = subscriptionService.getAll(SEED_USER_ID);

        assertTrue(all.stream().anyMatch(s -> s.name().equals("테스트구독") && s.price() == 9900));
    }

    @Test
    void 구독을_수정하면_변경값이_반영된다() {
        Subscription created = subscriptionService.create(SEED_USER_ID, "수정전", 1000, 10);

        subscriptionService.update(SEED_USER_ID, created.getId(), "수정후", 2000, 20);

        List<SubscriptionService.SubscriptionResponse> all = subscriptionService.getAll(SEED_USER_ID);
        assertTrue(all.stream().anyMatch(s -> s.name().equals("수정후") && s.price() == 2000 && s.billingDay() == 20));
    }

    @Test
    void 구독을_삭제하면_목록에서_사라진다() {
        Subscription created = subscriptionService.create(SEED_USER_ID, "삭제될구독", 5000, 5);

        subscriptionService.delete(SEED_USER_ID, created.getId());

        assertFalse(subscriptionRepository.existsById(created.getId()));
    }

    @Test
    void 존재하지_않는_id를_수정하면_예외가_발생한다() {
        assertThrows(NoSuchElementException.class,
                () -> subscriptionService.update(SEED_USER_ID, 999999L, "없음", 1000, 1));
    }
}

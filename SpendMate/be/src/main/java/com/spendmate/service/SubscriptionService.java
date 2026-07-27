package com.spendmate.service;

import com.spendmate.domain.Subscription;
import com.spendmate.domain.User;
import com.spendmate.repository.SubscriptionRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    public record SubscriptionResponse(Long id, String name, Integer price, Integer billingDay) {}

    public SubscriptionService(SubscriptionRepository subscriptionRepository, UserRepository userRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
    }

    public List<SubscriptionResponse> getAll(Long userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .map(sub -> new SubscriptionResponse(sub.getId(), sub.getServiceName(), sub.getAmount(), sub.getBillingDay()))
                .toList();
    }

    public Subscription create(Long userId, String name, Integer price, Integer billingDay) {
        validate(name, price, billingDay);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        Subscription subscription = new Subscription(user, name, price, billingDay);
        return subscriptionRepository.save(subscription);
    }

    public Subscription update(Long userId, Long id, String name, Integer price, Integer billingDay) {
        validate(name, price, billingDay);
        Subscription subscription = findOwned(userId, id);

        subscription.setServiceName(name);
        subscription.setAmount(price);
        subscription.setBillingDay(billingDay);
        return subscriptionRepository.save(subscription);
    }

    public void delete(Long userId, Long id) {
        Subscription subscription = findOwned(userId, id);
        subscriptionRepository.delete(subscription);
    }

    /**
     * id로 조회하되, 다른 사용자 소유의 구독이면 존재하지 않는 것과 동일하게 취급한다(#63 인증 차단 대비).
     */
    private Subscription findOwned(Long userId, Long id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 구독입니다: " + id));
        if (!subscription.getUser().getId().equals(userId)) {
            throw new NoSuchElementException("존재하지 않는 구독입니다: " + id);
        }
        return subscription;
    }

    private void validate(String name, Integer price, Integer billingDay) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("서비스명을 입력해주세요.");
        }
        if (price == null || price <= 0) {
            throw new IllegalArgumentException("금액은 0보다 커야 합니다.");
        }
        if (billingDay == null || billingDay < 1 || billingDay > 31) {
            throw new IllegalArgumentException("결제일은 1~31 사이여야 합니다.");
        }
    }
}

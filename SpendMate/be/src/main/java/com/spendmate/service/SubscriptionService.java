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

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    public record SubscriptionResponse(Long id, String name, Integer price, Integer billingDay) {}

    public SubscriptionService(SubscriptionRepository subscriptionRepository, UserRepository userRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
    }

    public List<SubscriptionResponse> getAll() {
        return subscriptionRepository.findByUserId(SEED_USER_ID).stream()
                .map(sub -> new SubscriptionResponse(sub.getId(), sub.getServiceName(), sub.getAmount(), sub.getBillingDay()))
                .toList();
    }

    public Subscription create(String name, Integer price, Integer billingDay) {
        validate(name, price, billingDay);
        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        Subscription subscription = new Subscription(user, name, price, billingDay);
        return subscriptionRepository.save(subscription);
    }

    public Subscription update(Long id, String name, Integer price, Integer billingDay) {
        validate(name, price, billingDay);
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("존재하지 않는 구독입니다: " + id));

        subscription.setServiceName(name);
        subscription.setAmount(price);
        subscription.setBillingDay(billingDay);
        return subscriptionRepository.save(subscription);
    }

    public void delete(Long id) {
        if (!subscriptionRepository.existsById(id)) {
            throw new NoSuchElementException("존재하지 않는 구독입니다: " + id);
        }
        subscriptionRepository.deleteById(id);
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
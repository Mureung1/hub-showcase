package com.spendmate.repository;

import com.spendmate.domain.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
}

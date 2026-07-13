package com.spendmate.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String serviceName;
    private Integer amount;
    private Integer billingDay;
    private LocalDateTime createdAt;

    protected Subscription() {
    }

    public Subscription(User user, String serviceName, Integer amount, Integer billingDay) {
        this.user = user;
        this.serviceName = serviceName;
        this.amount = amount;
        this.billingDay = billingDay;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getServiceName() {
        return serviceName;
    }

    public Integer getAmount() {
        return amount;
    }

    public Integer getBillingDay() {
        return billingDay;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

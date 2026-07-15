package com.spendmate.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "agent_recommendations")
public class AgentRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    @Enumerated(EnumType.STRING)
    private TriggerType triggerType;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @Column(columnDefinition = "TEXT")
    private String toolResultJson;

    private Integer estimatedSavings;

    private LocalDateTime createdAt;

    protected AgentRecommendation() {
    }

    public AgentRecommendation(User user, Receipt receipt, TriggerType triggerType,
                               String reasoning, String toolResultJson, Integer estimatedSavings) {
        this.user = user;
        this.receipt = receipt;
        this.triggerType = triggerType;
        this.reasoning = reasoning;
        this.toolResultJson = toolResultJson;
        this.estimatedSavings = estimatedSavings;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Receipt getReceipt() {
        return receipt;
    }

    public TriggerType getTriggerType() {
        return triggerType;
    }

    public String getReasoning() {
        return reasoning;
    }

    public String getToolResultJson() {
        return toolResultJson;
    }

    public Integer getEstimatedSavings() {
        return estimatedSavings;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
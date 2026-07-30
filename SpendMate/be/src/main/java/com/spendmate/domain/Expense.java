package com.spendmate.domain;

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
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    private String storeName;
    private String itemName;
    private Integer amount;

    @Enumerated(EnumType.STRING)
    private Category category;

    private LocalDateTime spentAt;

    @Enumerated(EnumType.STRING)
    private ExpenseInputType inputType;

    private LocalDateTime createdAt;

    protected Expense() {
    }

    public Expense(User user, Receipt receipt, String storeName, String itemName, Integer amount,
                   Category category, LocalDateTime spentAt, ExpenseInputType inputType) {
        this.user = user;
        this.receipt = receipt;
        this.storeName = storeName;
        this.itemName = itemName;
        this.amount = amount;
        this.category = category;
        this.spentAt = spentAt;
        this.inputType = inputType;
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

    public String getStoreName() {
        return storeName;
    }

    public String getItemName() {
        return itemName;
    }

    public Integer getAmount() {
        return amount;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public LocalDateTime getSpentAt() {
        return spentAt;
    }

    public ExpenseInputType getInputType() {
        return inputType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void updateManual(Integer amount, Category category, String memo, LocalDateTime spentAt) {
        this.amount = amount;
        this.category = category;
        this.itemName = memo;
        this.spentAt = spentAt;
    }
}

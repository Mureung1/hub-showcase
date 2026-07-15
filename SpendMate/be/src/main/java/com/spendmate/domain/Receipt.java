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
@Table(name = "receipts")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String ocrRawJson;

    @Enumerated(EnumType.STRING)
    private ReceiptSourceType sourceType;
    @Enumerated(EnumType.STRING)
    private OcrStatus ocrStatus;
    private LocalDateTime uploadedAt;

    protected Receipt() {
    }

    public Receipt(User user, String imageUrl, String ocrRawJson, ReceiptSourceType sourceType, OcrStatus ocrStatus) {
        this.user = user;
        this.imageUrl = imageUrl;
        this.ocrRawJson = ocrRawJson;
        this.sourceType = sourceType;
        this.ocrStatus = ocrStatus;
        this.uploadedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getOcrRawJson() {
        return ocrRawJson;
    }

    public ReceiptSourceType getSourceType() {
        return sourceType;
    }
    public OcrStatus getOcrStatus() {       // ← 이 세 줄 추가
        return ocrStatus;                   // ←
    }
    public void setOcrStatus(OcrStatus ocrStatus) {
        this.ocrStatus = ocrStatus;
    }

    public void setOcrRawJson(String ocrRawJson) {
        this.ocrRawJson = ocrRawJson;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
}

package com.hub.auth;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    /** 평문 코드는 저장하지 않는다. 메일로만 나가고 여기엔 해시만 남는다. */
    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected EmailVerification() {}

    public EmailVerification(String email, String codeHash, LocalDateTime expiresAt) {
        this.email = email;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    public boolean isExpired()  { return LocalDateTime.now().isAfter(expiresAt); }
    public boolean isVerified() { return verifiedAt != null; }
    /** 5회까지만 시도 허용 — 6자리 숫자를 무차별로 넣는 걸 막는다. */
    public boolean isBlocked()  { return attemptCount >= 5; }

    public void markVerified()  { this.verifiedAt = LocalDateTime.now(); }
    public void addAttempt()    { this.attemptCount++; }

    public Long getId()             { return id; }
    public String getEmail()        { return email; }
    public String getCodeHash()     { return codeHash; }
    public LocalDateTime getVerifiedAt() { return verifiedAt; }
}

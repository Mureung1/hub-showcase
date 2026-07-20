package com.hub.auth;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * ⚠️ 기존 프로젝트에 이미 User 엔티티가 있다면 이 파일을 지우고,
 *    UserRepository가 기존 엔티티를 가리키도록 바꾸세요.
 *    한 테이블에 엔티티가 두 개면 매핑이 충돌합니다.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    /** BCrypt 해시. 평문은 절대 들어오지 않는다. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private String nickname;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected User() {}

    public User(String email, String passwordHash, String nickname) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.emailVerified = true;          // 인증을 통과해야만 가입되므로
        this.verifiedAt = LocalDateTime.now();
    }

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    public Long getId()           { return id; }
    public String getEmail()      { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getNickname()   { return nickname; }
    public boolean isEmailVerified() { return emailVerified; }
}

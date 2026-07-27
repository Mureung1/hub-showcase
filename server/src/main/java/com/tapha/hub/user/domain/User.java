package com.tapha.hub.user.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String nickname;

    @Column(length = 30)
    private String provider;

    @Column(name = "provider_subject", length = 255)
    private String providerSubject;

    @Column(length = 320)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
    }

    public User(String nickname, Instant createdAt) {
        this.nickname = nickname;
        this.createdAt = createdAt;
    }

    public User(String nickname, String provider, String providerSubject, String email, Instant createdAt) {
        this.nickname = nickname;
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.email = email;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getNickname() {
        return nickname;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderSubject() {
        return providerSubject;
    }

    public String getEmail() {
        return email;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void updateGoogleProfile(String nickname, String email) {
        this.nickname = nickname;
        this.email = email;
    }
}

package com.hub.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    /** 같은 메일로 여러 번 보냈을 수 있으므로 항상 최신 것 하나만 본다. */
    Optional<EmailVerification> findTopByEmailOrderByIdDesc(String email);

    /** 가입 시점에 "이 메일이 인증을 통과했는지" 확인용. */
    boolean existsByEmailAndVerifiedAtIsNotNull(String email);

    /** 재발송 도배 방지 — 최근 N초 내 발송 건이 있는지. */
    boolean existsByEmailAndCreatedAtAfter(String email, LocalDateTime after);
}

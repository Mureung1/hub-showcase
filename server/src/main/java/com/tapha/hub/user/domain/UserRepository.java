package com.tapha.hub.user.domain;

import java.util.Optional;
import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByProviderAndProviderSubject(String provider, String providerSubject);

    @Modifying
    @Query(value = """
            INSERT IGNORE INTO users (nickname, provider, provider_subject, email, created_at)
            VALUES (:nickname, 'GOOGLE', :subject, :email, :createdAt)
            """, nativeQuery = true)
    void insertGoogleUser(
            @Param("nickname") String nickname,
            @Param("subject") String subject,
            @Param("email") String email,
            @Param("createdAt") Instant createdAt
    );
}

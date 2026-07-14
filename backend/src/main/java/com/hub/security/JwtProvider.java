package com.hub.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

@Component
public class JwtProvider {

    private final SecretKey key;
    private final String issuer;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.access-token-ttl}") Duration accessTtl,
            @Value("${app.jwt.refresh-token-ttl}") Duration refreshTtl) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public String createAccessToken(Long userId) {
        return create(userId, accessTtl);
    }

    public String createRefreshToken(Long userId) {
        return create(userId, refreshTtl);
    }

    private String create(Long userId, Duration ttl) {
        Date now = new Date();
        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttl.toMillis()))
                .signWith(key)
                .compact();
    }

    /** 유효하면 userId, 아니면 null */
    public Long parseUserId(String token) {
        try {
            String subject = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
            return Long.valueOf(subject);
        } catch (Exception e) {
            return null;
        }
    }
}

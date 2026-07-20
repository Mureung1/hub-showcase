package com.hub.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 발급·검증.
 *
 * 비밀키는 코드에 절대 넣지 않는다. 환경변수(JWT_SECRET)로 주입한다.
 * 키가 유출되면 누구나 아무 사용자로 위조 토큰을 만들 수 있다.
 */
@Component
public class JwtProvider {

    private final SecretKey key;
    private final long validityMs;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.validity-seconds:3600}") long validitySeconds) {

        // HS256은 최소 32바이트 키를 요구한다. 짧으면 여기서 바로 터진다.
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.validityMs = validitySeconds * 1000;
    }

    public String createToken(Long userId, String email) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + validityMs))
                .signWith(key)
                .compact();
    }

    /** 유효하면 userId, 아니면 null. 만료·위조 모두 null로 처리한다. */
    public Long parseUserId(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public long getValiditySeconds() { return validityMs / 1000; }
}

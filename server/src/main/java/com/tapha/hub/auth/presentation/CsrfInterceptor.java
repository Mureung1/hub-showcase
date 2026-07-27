package com.tapha.hub.auth.presentation;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.tapha.hub.auth.application.SessionAuth;

@Component
public class CsrfInterceptor implements HandlerInterceptor {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final SessionAuth sessionAuth;

    public CsrfInterceptor(SessionAuth sessionAuth) {
        this.sessionAuth = sessionAuth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (SAFE_METHODS.contains(request.getMethod())) {
            return true;
        }
        String expected = sessionAuth.requireCsrfToken(request);
        String provided = request.getHeader("X-CSRF-Token");
        if (provided == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new InvalidCsrfTokenException();
        }
        return true;
    }
}

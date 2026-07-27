package com.tapha.hub.auth.application;

import java.security.SecureRandom;
import java.util.Base64;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Component;

import com.tapha.hub.auth.presentation.AuthenticationRequiredException;

@Component
public class SessionAuth {

    public static final String USER_ID = "AUTHENTICATED_USER_ID";
    public static final String CSRF_TOKEN = "CSRF_TOKEN";

    private final SecureRandom secureRandom = new SecureRandom();

    public Long requireUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(USER_ID) == null) {
            throw new AuthenticationRequiredException();
        }
        return (Long) session.getAttribute(USER_ID);
    }

    public String start(HttpServletRequest request, Long userId) {
        HttpSession previousSession = request.getSession(false);
        if (previousSession != null) {
            previousSession.invalidate();
        }
        HttpSession session = request.getSession(true);
        session.setAttribute(USER_ID, userId);
        String csrfToken = newCsrfToken();
        session.setAttribute(CSRF_TOKEN, csrfToken);
        return csrfToken;
    }

    public String requireCsrfToken(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(CSRF_TOKEN) == null) {
            throw new AuthenticationRequiredException();
        }
        return (String) session.getAttribute(CSRF_TOKEN);
    }

    private String newCsrfToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

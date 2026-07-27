package com.tapha.hub.auth.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.tapha.hub.auth.application.SessionAuth;

@Component
public class AuthenticationInterceptor implements HandlerInterceptor {

    private final SessionAuth sessionAuth;

    public AuthenticationInterceptor(SessionAuth sessionAuth) {
        this.sessionAuth = sessionAuth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equals(request.getMethod())) {
            return true;
        }
        sessionAuth.requireUserId(request);
        return true;
    }
}

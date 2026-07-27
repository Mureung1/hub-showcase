package com.tapha.hub.auth.application;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.auth.presentation.AuthSessionResponse;
import com.tapha.hub.user.application.UserService;
import com.tapha.hub.user.presentation.UserResponse;

@Service
public class AuthService {

    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final UserService userService;
    private final SessionAuth sessionAuth;

    public AuthService(
            GoogleIdentityVerifier googleIdentityVerifier,
            UserService userService,
            SessionAuth sessionAuth
    ) {
        this.googleIdentityVerifier = googleIdentityVerifier;
        this.userService = userService;
        this.sessionAuth = sessionAuth;
    }

    @Transactional
    public AuthSessionResponse login(String credential, HttpServletRequest request) {
        UserResponse user = userService.login(googleIdentityVerifier.verify(credential));
        return new AuthSessionResponse(user, sessionAuth.start(request, user.id()));
    }

    @Transactional(readOnly = true)
    public AuthSessionResponse current(HttpServletRequest request) {
        Long userId = sessionAuth.requireUserId(request);
        return new AuthSessionResponse(userService.get(userId), sessionAuth.requireCsrfToken(request));
    }
}

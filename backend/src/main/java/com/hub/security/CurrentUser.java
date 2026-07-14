package com.hub.security;

import com.hub.common.ApiException;
import org.springframework.security.core.context.SecurityContextHolder;

/** 컨트롤러에서 CurrentUser.id() 로 현재 사용자 ID를 꺼낸다. */
public final class CurrentUser {

    private CurrentUser() {}

    public static Long id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId)) {
            throw ApiException.unauthorized("로그인이 필요합니다.");
        }
        return userId;
    }
}

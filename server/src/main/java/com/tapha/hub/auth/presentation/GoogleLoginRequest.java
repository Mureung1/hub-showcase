package com.tapha.hub.auth.presentation;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Google 로그인 정보가 필요해요.") String credential
) {
}

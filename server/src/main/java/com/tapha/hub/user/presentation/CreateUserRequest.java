package com.tapha.hub.user.presentation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "닉네임을 입력해 주세요.")
        @Size(max = 40, message = "닉네임은 40자 이하여야 해요.")
        String nickname
) {
}

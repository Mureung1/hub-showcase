package com.hub.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDto {

    public record SignUpRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
            @NotBlank String name
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record TokenResponse(String accessToken, String refreshToken, Long userId) {}

    public record MeResponse(Long id, String email, String name, int completeness) {}
}

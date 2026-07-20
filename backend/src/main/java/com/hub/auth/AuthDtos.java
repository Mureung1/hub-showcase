package com.hub.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 요청/응답 모양. 검증은 어노테이션이 대신한다 (위반 시 자동 400).
 */
public class AuthDtos {

    /** 1단계 — 인증코드 발송 */
    public record SendCodeRequest(
            @NotBlank @Email(message = "이메일 형식이 아닙니다.") String email
    ) {}

    /** 2단계 — 코드 확인 */
    public record VerifyCodeRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "인증코드는 숫자 6자리입니다.") String code
    ) {}

    /** 3단계 — 가입 */
    public record SignupRequest(
            @NotBlank @Email String email,
            // 길이만 강제한다. 특수문자 강제는 오히려 예측 가능한 비밀번호를 만든다.
            @NotBlank @Size(min = 8, max = 64, message = "비밀번호는 8자 이상입니다.") String password,
            @NotBlank @Size(max = 20) String nickname
    ) {}

    /** 4단계 — 로그인 */
    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    /** 로그인 성공 응답 */
    public record TokenResponse(String accessToken, long expiresIn, String nickname) {}

    /** 내 정보 */
    public record MeResponse(Long id, String email, String nickname) {}
}

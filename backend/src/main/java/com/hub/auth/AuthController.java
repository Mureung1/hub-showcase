package com.hub.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 *  POST /api/auth/code    인증코드 발송
 *  POST /api/auth/verify  코드 확인
 *  POST /api/auth/signup  가입
 *  POST /api/auth/login   로그인 → JWT
 *  GET  /api/auth/me      내 정보 (토큰 필요)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/code")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendCode(@Valid @RequestBody AuthDtos.SendCodeRequest req) {
        authService.sendCode(req.email());
    }

    @PostMapping("/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody AuthDtos.VerifyCodeRequest req) {
        authService.verifyCode(req.email(), req.code());
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public void signup(@Valid @RequestBody AuthDtos.SignupRequest req) {
        authService.signup(req.email(), req.password(), req.nickname());
    }

    @PostMapping("/login")
    public AuthDtos.TokenResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return authService.login(req.email(), req.password());
    }

    /** JwtAuthenticationFilter가 넣어둔 userId가 그대로 들어온다. */
    @GetMapping("/me")
    public AuthDtos.MeResponse me(@AuthenticationPrincipal Long userId) {
        return authService.me(userId);
    }

    // ── 예외 → 상태코드 ─────────────────────────────────────
    @ExceptionHandler(AuthException.EmailAlreadyUsed.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> emailUsed() {
        return Map.of("error", "이미 가입된 이메일입니다.");
    }

    @ExceptionHandler(AuthException.InvalidCode.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidCode() {
        return Map.of("error", "인증코드가 올바르지 않거나 만료되었습니다.");
    }

    @ExceptionHandler(AuthException.EmailNotVerified.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> notVerified() {
        return Map.of("error", "이메일 인증이 필요합니다.");
    }

    @ExceptionHandler(AuthException.LoginFailed.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, String> loginFailed() {
        // 어느 쪽이 틀렸는지 알려주지 않는다 (계정 존재 여부 노출 방지)
        return Map.of("error", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    @ExceptionHandler(AuthException.TooManyRequests.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public Map<String, String> tooMany() {
        return Map.of("error", "잠시 후 다시 시도해 주세요.");
    }
}

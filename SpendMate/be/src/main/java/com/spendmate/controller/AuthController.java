package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthController {

    private final AuthService authService;

    public record SignupRequest(String email, String password, String nickname) {}
    public record LoginRequest(String email, String password) {}
    public record UpdateProfileRequest(String email, String nickname) {}

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/signup")
    public ResponseEntity<AuthService.SignupResponse> signup(@RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        AuthService.SignupResponse response = authService.signup(request.email(), request.password(), request.nickname());
        httpRequest.getSession(true).setAttribute("userId", response.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<AuthService.LoginResponse> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        AuthService.LoginResponse response = authService.login(request.email(), request.password());
        httpRequest.getSession(true).setAttribute("userId", response.id());
        return ResponseEntity.ok(response);
    }

    /**
     * 새로고침 시 프론트가 세션이 아직 유효한지 확인하는 용도 (#60). 세션 없으면 CurrentUserArgumentResolver가 401을 던진다.
     */
    @GetMapping("/api/auth/me")
    public ResponseEntity<AuthService.LoginResponse> me(@CurrentUser Long userId) {
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }

    @PatchMapping("/api/auth/me")
    public ResponseEntity<AuthService.LoginResponse> updateMe(@CurrentUser Long userId, @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(userId, request.email(), request.nickname()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
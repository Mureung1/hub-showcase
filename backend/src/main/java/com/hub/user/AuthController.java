package com.hub.user;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.hub.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;


    /** GET /api/auth/me — 현재 사용자 + 이력 완성도 */
    @GetMapping("/me")
    public AuthDto.MeResponse me() {
        return authService.me(CurrentUser.id());
    }
    /** POST /api/auth/signup */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthDto.TokenResponse signUp(@Valid @RequestBody AuthDto.SignUpRequest req) {
        return authService.signUp(req);
    }

    /** POST /api/auth/login */
    @PostMapping("/login")
    public AuthDto.TokenResponse login(@Valid @RequestBody AuthDto.LoginRequest req) {
        return authService.login(req);
    }
}

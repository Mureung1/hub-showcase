package com.hub.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtProvider jwtProvider;

    // 예측 불가능한 난수. 일반 Random은 다음 값이 계산 가능해 인증코드에 쓰면 안 된다.
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       EmailVerificationRepository verificationRepository,
                       PasswordEncoder passwordEncoder,
                       MailService mailService,
                       JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.verificationRepository = verificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.jwtProvider = jwtProvider;
    }

    // ── 1단계: 인증코드 발송 ─────────────────────────────────
    @Transactional
    public void sendCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new AuthException.EmailAlreadyUsed();
        }
        // 재발송 도배 방지 — 60초에 한 번만
        if (verificationRepository.existsByEmailAndCreatedAtAfter(email, LocalDateTime.now().minusSeconds(60))) {
            throw new AuthException.TooManyRequests();
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        // 코드도 비밀번호처럼 해시해서 저장한다.
        verificationRepository.save(new EmailVerification(
                email,
                passwordEncoder.encode(code),
                LocalDateTime.now().plusMinutes(5)
        ));

        mailService.sendVerificationCode(email, code);   // 평문 코드는 메일로만 나간다
    }

    // ── 2단계: 코드 확인 ────────────────────────────────────
    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification v = verificationRepository.findTopByEmailOrderByIdDesc(email)
                .orElseThrow(AuthException.InvalidCode::new);

        if (v.isExpired() || v.isBlocked()) throw new AuthException.InvalidCode();

        if (!passwordEncoder.matches(code, v.getCodeHash())) {
            v.addAttempt();                       // 틀릴 때마다 시도 횟수 증가 (5회 초과 시 폐기)
            throw new AuthException.InvalidCode();
        }
        v.markVerified();
    }

    // ── 3단계: 가입 ────────────────────────────────────────
    @Transactional
    public void signup(String email, String rawPassword, String nickname) {
        // 인증을 건너뛰고 이 API를 직접 호출하는 경우를 막는다.
        // 프론트에서 순서를 지키는 것만으론 보증이 안 된다.
        if (!verificationRepository.existsByEmailAndVerifiedAtIsNotNull(email)) {
            throw new AuthException.EmailNotVerified();
        }
        if (userRepository.existsByEmail(email)) {
            throw new AuthException.EmailAlreadyUsed();
        }
        userRepository.save(new User(email, passwordEncoder.encode(rawPassword), nickname));
    }

    // ── 4단계: 로그인 ──────────────────────────────────────
    @Transactional(readOnly = true)
    public AuthDtos.TokenResponse login(String email, String rawPassword) {
        // 이메일이 없든 비밀번호가 틀리든 같은 예외를 던진다.
        // 구분해서 알려주면 "이 메일은 가입돼 있다"는 정보가 새어나간다.
        User user = userRepository.findByEmail(email)
                .orElseThrow(AuthException.LoginFailed::new);

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new AuthException.LoginFailed();
        }
        if (!user.isEmailVerified()) throw new AuthException.EmailNotVerified();

        return new AuthDtos.TokenResponse(
                jwtProvider.createToken(user.getId(), user.getEmail()),
                jwtProvider.getValiditySeconds(),
                user.getNickname()
        );
    }

    @Transactional(readOnly = true)
    public AuthDtos.MeResponse me(Long userId) {
        User u = userRepository.findById(userId).orElseThrow(AuthException.LoginFailed::new);
        return new AuthDtos.MeResponse(u.getId(), u.getEmail(), u.getNickname());
    }
}

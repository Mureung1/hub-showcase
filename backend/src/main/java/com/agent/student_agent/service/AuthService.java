package com.agent.student_agent.service;

import com.agent.student_agent.domain.Member;
import com.agent.student_agent.dto.AuthResponse;
import com.agent.student_agent.dto.LoginRequest;
import com.agent.student_agent.dto.RegisterRequest;
import com.agent.student_agent.repository.MemberRepository;
import com.agent.student_agent.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public AuthResponse register(RegisterRequest request) {
        if (memberRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
        }

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .major(request.getMajor())
                .grade(request.getGrade())
                .build();
        
        memberRepository.save(member);
        
        String token = jwtProvider.createToken(member.getEmail());
        return new AuthResponse(token, member.getName());
    }

    public AuthResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다."));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("잘못된 비밀번호입니다.");
        }

        String token = jwtProvider.createToken(member.getEmail());
        return new AuthResponse(token, member.getName());
    }
}

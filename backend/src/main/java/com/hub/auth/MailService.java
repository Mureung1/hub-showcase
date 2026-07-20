package com.hub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@example.com}")
    private String from;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * 메일 발송은 느리다(수백 ms~수 초). 동기로 보내면 사용자가 그만큼 기다린다.
     * @Async로 빼서 API는 즉시 응답한다.
     * (메인 클래스에 @EnableAsync 필요)
     */
    @Async
    public void sendVerificationCode(String to, String code) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject("[라인업] 이메일 인증코드");
        msg.setText("""
                인증코드: %s

                5분 안에 입력해 주세요.
                본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.
                """.formatted(code));
        mailSender.send(msg);
    }
}

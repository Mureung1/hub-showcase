package com.tapha.hub.auth.presentation;

public class InvalidGoogleCredentialException extends RuntimeException {
    public InvalidGoogleCredentialException() {
        super("Google 로그인 정보를 확인할 수 없어요.");
    }
}

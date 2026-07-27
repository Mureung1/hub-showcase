package com.tapha.hub.auth.presentation;

public class AuthenticationRequiredException extends RuntimeException {
    public AuthenticationRequiredException() {
        super("로그인이 필요해요.");
    }
}

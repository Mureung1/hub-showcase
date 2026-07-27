package com.tapha.hub.auth.presentation;

public class InvalidCsrfTokenException extends RuntimeException {
    public InvalidCsrfTokenException() {
        super("요청을 확인할 수 없어요. 새로고침 후 다시 시도해 주세요.");
    }
}

package com.hub.auth;

/**
 * 도메인 예외. HTTP를 모른다 — 상태코드 변환은 Controller가 한다.
 */
public class AuthException {
    public static class EmailAlreadyUsed  extends RuntimeException {}  // 409
    public static class EmailNotVerified  extends RuntimeException {}  // 403
    public static class InvalidCode       extends RuntimeException {}  // 400
    public static class LoginFailed       extends RuntimeException {}  // 401
    public static class TooManyRequests   extends RuntimeException {}  // 429
}

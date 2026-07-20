package com.tapha.hub.common.application;

public class InvalidRequestException extends RuntimeException {
    private final String code;

    public InvalidRequestException(String message) {
        this("INVALID_PAGE_RANGE", message);
    }

    public InvalidRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

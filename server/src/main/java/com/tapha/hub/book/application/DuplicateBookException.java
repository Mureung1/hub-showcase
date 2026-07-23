package com.tapha.hub.book.application;

public class DuplicateBookException extends RuntimeException {

    public DuplicateBookException() {
        super("이 판본은 이미 책장에 등록되어 있어요.");
    }
}

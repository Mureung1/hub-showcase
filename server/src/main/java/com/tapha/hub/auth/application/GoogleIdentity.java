package com.tapha.hub.auth.application;

public record GoogleIdentity(String subject, String email, String name) {
}

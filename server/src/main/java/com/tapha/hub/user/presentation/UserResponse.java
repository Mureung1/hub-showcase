package com.tapha.hub.user.presentation;

import java.time.Instant;

import com.tapha.hub.user.domain.User;

public record UserResponse(Long id, String nickname, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getNickname(), user.getCreatedAt());
    }
}

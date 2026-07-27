package com.tapha.hub.auth.presentation;

import com.tapha.hub.user.presentation.UserResponse;

public record AuthSessionResponse(UserResponse user, String csrfToken) {
}

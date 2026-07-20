package com.tapha.hub.book.presentation;

import com.tapha.hub.book.domain.BookStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateBookStatusRequest(
        @NotNull(message = "사용자 정보가 필요해요.") Long userId,
        @NotNull(message = "책 상태를 선택해 주세요.") BookStatus status,
        @Size(max = 10000, message = "완독 서평은 10000자 이하여야 해요.") String finalReview
) {
}

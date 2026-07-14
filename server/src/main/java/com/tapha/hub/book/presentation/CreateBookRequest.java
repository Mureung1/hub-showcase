package com.tapha.hub.book.presentation;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateBookRequest(
        @NotNull(message = "사용자 정보가 필요해요.")
        Long userId,

        @NotBlank(message = "책 제목을 입력해 주세요.")
        @Size(max = 255, message = "책 제목은 255자 이하여야 해요.")
        String title,

        @Size(max = 255, message = "저자는 255자 이하여야 해요.")
        String author,

        @Min(value = 1, message = "시작 페이지는 1 이상이어야 해요.")
        Integer initialPage
) {
}

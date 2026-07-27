package com.tapha.hub.book.presentation;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBookRequest(
        @NotBlank(message = "검색한 책을 선택해 주세요.")
        @Size(max = 255, message = "검색한 책 정보가 너무 길어요.")
        String providerId,

        @Min(value = 1, message = "시작 페이지는 1 이상이어야 해요.")
        Integer initialPage
) {
}

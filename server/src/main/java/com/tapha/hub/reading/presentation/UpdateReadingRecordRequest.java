package com.tapha.hub.reading.presentation;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReadingRecordRequest(
        @NotNull(message = "끝난 페이지를 입력해 주세요.")
        @Min(value = 1, message = "끝난 페이지는 1 이상이어야 해요.") Integer endPage,
        @Size(max = 1000, message = "감상은 1000자 이하여야 해요.") String impression
) {
}

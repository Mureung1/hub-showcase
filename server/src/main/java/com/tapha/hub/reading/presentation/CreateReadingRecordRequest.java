package com.tapha.hub.reading.presentation;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReadingRecordRequest(
        @NotNull(message = "사용자 정보가 필요해요.") Long userId,
        @NotNull(message = "끝난 페이지를 입력해 주세요.") @Min(value = 1, message = "끝난 페이지는 1 이상이어야 해요.") Integer endPage,
        @Min(value = 1, message = "시작 페이지는 1 이상이어야 해요.") Integer startPageOverride,
        @Size(max = 1000, message = "감상은 1000자 이하여야 해요.") String impression,
        @Min(value = 0, message = "독서 시간은 0초 이상이어야 해요.") Integer readingDurationSeconds
) { }

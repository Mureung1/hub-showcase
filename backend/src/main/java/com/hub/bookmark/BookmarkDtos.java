package com.hub.bookmark;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * 요청/응답 DTO.
 * Express 슬라이스에서 손으로 하던 입력 검증을 여기서는 @NotNull이 대신한다.
 */
public class BookmarkDtos {

    // POST body — @Valid가 걸리면 null일 때 자동으로 400을 낸다
    public record CreateRequest(
            @NotNull(message = "userId는 필수입니다.")    Long userId,
            @NotNull(message = "postingId는 필수입니다.") Long postingId
    ) {}
}

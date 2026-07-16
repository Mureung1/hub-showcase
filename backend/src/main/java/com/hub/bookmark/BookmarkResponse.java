package com.hub.bookmark;

import java.time.LocalDateTime;

/**
 * 목록 응답. 조인 결과를 바로 담는 투영 DTO.
 * JPQL의 new com.hub.bookmark.BookmarkResponse(...) 가 이 생성자를 호출한다.
 */
public record BookmarkResponse(
        Long id,
        Long postingId,
        String title,
        String company,
        LocalDateTime createdAt
) {}

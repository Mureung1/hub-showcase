package com.hub.bookmark;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    // 중복 저장 방지에 사용 (409 판단)
    boolean existsByUserIdAndPostingId(Long userId, Long postingId);

    // 목록 조회 — job_postings, companies를 조인해 화면에 필요한 값만 뽑는다.
    // 엔티티 전체 대신 DTO로 바로 투영(projection)해 필요 없는 컬럼을 안 읽는다.
    @Query("""
        SELECT new com.hub.bookmark.BookmarkResponse(
            b.id, b.postingId, p.title, c.name, b.createdAt)
        FROM Bookmark b
        JOIN JobPosting p ON p.id = b.postingId
        JOIN Company    c ON c.id = p.companyId
        WHERE b.userId = :userId
        ORDER BY b.createdAt DESC
        """)
    List<BookmarkResponse> findResponsesByUserId(@Param("userId") Long userId);
}

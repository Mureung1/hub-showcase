package com.hub.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {

    /** F4 — 적합도 높은 순 정렬. 목록 화면이 이 쿼리 하나로 그려진다. */
    List<MatchScore> findByUserIdOrderByScoreDesc(Long userId);

    @Query("select m from MatchScore m left join fetch m.details "
            + "where m.userId = :userId and m.postingId = :postingId")
    Optional<MatchScore> findWithDetails(Long userId, Long postingId);
}

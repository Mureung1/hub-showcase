package com.hub.position;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    @Query("select p from JobPosting p left join fetch p.requirements where p.id = :id")
    Optional<JobPosting> findWithRequirements(Long id);

    /** 목록 카드 태그용. 가중치 높은 순으로 정규화 subject 만 뽑는다. */
    @Query("""
        select r.posting.id, r.subject
        from JobRequirement r
        where r.posting.id in :postingIds
          and r.subject is not null
          and r.type in (com.hub.position.RequirementType.SKILL_USE,
                         com.hub.position.RequirementType.EXPERIENCE_YEARS)
        order by r.weight desc nulls last
        """)
    List<Object[]> findSubjectsByPostingIds(@Param("postingIds") Collection<Long> postingIds);

    boolean existsBySourceUrl(String sourceUrl);
}

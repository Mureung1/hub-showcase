package com.hub.position;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    @Query("select p from JobPosting p left join fetch p.requirements where p.id = :id")
    Optional<JobPosting> findWithRequirements(Long id);

    boolean existsBySourceUrl(String sourceUrl);
}

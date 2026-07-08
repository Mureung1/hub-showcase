package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.PriorityScore;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriorityScoreRepository extends JpaRepository<PriorityScore, Long> {
}

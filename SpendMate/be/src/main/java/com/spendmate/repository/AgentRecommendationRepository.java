package com.spendmate.repository;

import com.spendmate.domain.AgentRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRecommendationRepository extends JpaRepository<AgentRecommendation, Long> {
}
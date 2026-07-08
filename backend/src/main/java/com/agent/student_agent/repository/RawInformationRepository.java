package com.agent.student_agent.repository;

import com.agent.student_agent.domain.RawInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RawInformationRepository extends JpaRepository<RawInformation, Long> {
    List<RawInformation> findTop5ByOrderByCreatedAtDesc();
}

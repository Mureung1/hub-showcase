package com.agent.student_agent.repository;

import com.agent.student_agent.domain.ActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActionItemRepository extends JpaRepository<ActionItem, Long> {
    List<ActionItem> findByMemberIdAndIsCompletedFalseOrderByPriorityScoreDesc(Long memberId);
}

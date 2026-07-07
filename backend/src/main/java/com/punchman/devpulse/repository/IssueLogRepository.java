package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.IssueLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssueLogRepository extends JpaRepository<IssueLog, Long> {
}

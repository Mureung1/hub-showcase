package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.CommitLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommitLogRepository extends JpaRepository<CommitLog, Long> {
}

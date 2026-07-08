package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.DocStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocStatusRepository extends JpaRepository<DocStatus, Long> {
}

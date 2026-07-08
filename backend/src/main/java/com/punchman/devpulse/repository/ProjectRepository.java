package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}

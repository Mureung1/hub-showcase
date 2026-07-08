package com.punchman.devpulse.repository;

import com.punchman.devpulse.domain.DocSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocSuggestionRepository extends JpaRepository<DocSuggestion, Long> {
}

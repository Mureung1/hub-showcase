package com.hub.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GeneratedDocRepository extends JpaRepository<GeneratedDoc, Long> {
    List<GeneratedDoc> findByUserIdAndPostingId(Long userId, Long postingId);
    Optional<GeneratedDoc> findByIdAndUserId(Long id, Long userId);
}

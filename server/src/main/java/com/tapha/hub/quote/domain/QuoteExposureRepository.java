package com.tapha.hub.quote.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteExposureRepository extends JpaRepository<QuoteExposure, Long> {
    Optional<QuoteExposure> findByIdAndUserId(Long id, Long userId);
}

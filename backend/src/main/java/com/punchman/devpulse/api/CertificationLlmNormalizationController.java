package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationLlmNormalizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기존 수집 트리거(/api/job-postings/collect)와 완전히 분리된 엔드포인트 — 규칙 매칭이
 * 놓친 공고만 골라 Groq에 배치로 물어본다. Kafka 컨슈머의 실시간 경로와 무관하게 사용자가
 * 명시적으로 트리거할 때만 LLM을 호출한다("배치 호출만, 실시간 스트리밍 금지" 원칙).
 */
@RestController
@RequestMapping("/api/certification-mentions")
@RequiredArgsConstructor
public class CertificationLlmNormalizationController {

    private final CertificationLlmNormalizationService certificationLlmNormalizationService;

    @PostMapping("/normalize-llm")
    public CertificationLlmNormalizationResponse normalizeLlm(@RequestParam String jobTitle) {
        if (jobTitle.isBlank()) {
            throw new IllegalArgumentException("jobTitle 파라미터가 필요합니다.");
        }
        int newMatchCount = certificationLlmNormalizationService.normalize(jobTitle);
        return new CertificationLlmNormalizationResponse(newMatchCount);
    }
}

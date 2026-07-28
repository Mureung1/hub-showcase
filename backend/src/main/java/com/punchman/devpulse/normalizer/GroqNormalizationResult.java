package com.punchman.devpulse.normalizer;

import java.util.List;

public record GroqNormalizationResult(List<PostingMatch> results) {

    public record PostingMatch(int postingIndex, List<CertificationMatch> matches) {
    }

    /**
     * evidence는 원문에서 그대로 인용한 근거 구절이다 — LLM이 왜 이 자격증이 언급됐다고
     * 판단했는지 검증 가능하게 만든다. 이 값이 실제 원문에 존재하는지는
     * CertificationLlmNormalizationService가 저장 전에 기계적으로 재확인한다(LLM의 자기
     * 신고만 믿지 않음).
     */
    public record CertificationMatch(String certificationName, String field, String evidence) {
    }
}

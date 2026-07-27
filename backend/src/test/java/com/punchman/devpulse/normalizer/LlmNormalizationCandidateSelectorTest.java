package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.JobPosting;
import java.util.List;
import org.junit.jupiter.api.Test;

class LlmNormalizationCandidateSelectorTest {

    private static final List<Certification> CERTIFICATIONS = List.of(
            Certification.builder().id(1L).name("산업안전기사").build(),
            Certification.builder().id(2L).name("SQLD").build());

    @Test
    void ruleMatchedPostingIsExcluded() {
        JobPosting posting = posting("산업안전기사 자격증 소지자에 한함", null);

        List<JobPosting> candidates = LlmNormalizationCandidateSelector.selectCandidates(
                List.of(posting), CERTIFICATIONS);

        assertThat(candidates).isEmpty();
    }

    @Test
    void ruleUnmatchedButNoQualificationKeywordIsExcluded() {
        JobPosting posting = posting("대한민국 국적을 보유한 자", "장애인 우대");

        List<JobPosting> candidates = LlmNormalizationCandidateSelector.selectCandidates(
                List.of(posting), CERTIFICATIONS);

        assertThat(candidates).isEmpty();
    }

    @Test
    void ruleUnmatchedWithQualificationKeywordIsIncluded() {
        JobPosting posting = posting("관련 산업기사 이상 국가기술자격증 소지자", null);

        List<JobPosting> candidates = LlmNormalizationCandidateSelector.selectCandidates(
                List.of(posting), CERTIFICATIONS);

        assertThat(candidates).containsExactly(posting);
    }

    private JobPosting posting(String qualificationText, String preferenceText) {
        return JobPosting.builder()
                .applicationQualification(qualificationText)
                .preferenceDetail(preferenceText)
                .build();
    }
}

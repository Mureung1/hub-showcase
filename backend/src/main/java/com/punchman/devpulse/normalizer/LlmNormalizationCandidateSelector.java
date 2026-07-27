package com.punchman.devpulse.normalizer;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 전체 공고 텍스트를 매번 LLM에 넘기지 않기 위한 사전 필터. 규칙 기반 매칭(7종 전부)이
 * 완전히 실패한 공고 중에서도, 자격증 관련 일반 키워드조차 없는 공고(대부분)는 LLM 후보에서
 * 아예 제외한다.
 */
public final class LlmNormalizationCandidateSelector {

    private static final Pattern QUALIFICATION_KEYWORD_PATTERN =
            Pattern.compile("자격|면허|기사|기능사");

    private LlmNormalizationCandidateSelector() {
    }

    public static List<JobPosting> selectCandidates(List<JobPosting> postings, List<Certification> certifications) {
        return postings.stream()
                .filter(posting -> ruleMatchedNothing(posting, certifications))
                .filter(LlmNormalizationCandidateSelector::hasQualificationKeyword)
                .toList();
    }

    private static boolean ruleMatchedNothing(JobPosting posting, List<Certification> certifications) {
        for (Certification certification : certifications) {
            MentionField field = CertificationTextMatcher.classify(
                    certification.getName(),
                    posting.getApplicationQualification(),
                    posting.getPreferenceDetail());
            if (field != MentionField.NONE) {
                return false;
            }
        }
        return true;
    }

    private static boolean hasQualificationKeyword(JobPosting posting) {
        return containsKeyword(posting.getApplicationQualification())
                || containsKeyword(posting.getPreferenceDetail());
    }

    private static boolean containsKeyword(String text) {
        return text != null && QUALIFICATION_KEYWORD_PATTERN.matcher(text).find();
    }
}

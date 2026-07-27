package com.punchman.devpulse.service;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationLlmMatch;
import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.normalizer.CertificationTextMatcher;
import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
import com.punchman.devpulse.repository.jpa.CertificationLlmMatchRepository;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * job_posting 원문에서 자격증 언급 여부를 룰 기반(단순 contains)으로 재계산해
 * certification_mention을 덮어쓴다. 시드값 위에 누적하지 않는다 — total_posting_count는
 * "실제 수집된 공고 수"라는 의미라서 가짜 시드와 섞이면 분모 자체가 거짓이 된다.
 *
 * essential/preferred 카운트는 공고 단위 문맥(자격요건 vs 우대사항) 분류다.
 * CertificationRankingService.resolveEmphasis()가 이 값을 그대로 강조도(EmphasisLevel)
 * 판정 근거로 쓴다 — 자격요건에 한 번이라도 등장하면 필수, 우대사항에만 등장하면 우대.
 *
 * 룰 매칭이 실패한 (공고, 자격증) 조합은 CertificationLlmMatch 원장(Issue 16, LLM 배치
 * 정규화 결과)도 확인한다 — 원장은 룰이 이미 잡은 조합을 담지 않으므로 이중 집계가 없다.
 * 이 조회는 이미 저장된 데이터를 읽는 것뿐이라 LLM API 호출이 이 경로(Kafka 컨슈머가
 * 공고 저장 직후 동기 호출)에 새로 생기지 않는다 — 실시간 스트리밍 금지 원칙과 무관.
 */
@Service
@RequiredArgsConstructor
public class CertificationMentionRecalculationService {

    private final JobPostingRepository jobPostingRepository;
    private final CertificationMentionRepository certificationMentionRepository;
    private final CertificationRepository certificationRepository;
    private final CertificationLlmMatchRepository certificationLlmMatchRepository;

    @Transactional
    public void recalculate(String jobTitle) {
        List<JobPosting> postings = jobPostingRepository.findByJobTitle(jobTitle);
        int total = postings.size();
        if (total == 0) {
            return;
        }

        Map<Long, CertificationMention> existingByCertificationId = certificationMentionRepository
                .findByJobTitle(jobTitle).stream()
                .collect(Collectors.toMap(m -> m.getCertification().getId(), Function.identity()));

        Map<Long, Map<Long, MentionField>> llmMatchesByPostingAndCertification =
                loadLlmMatches(jobTitle);

        for (Certification certification : certificationRepository.findAll()) {
            int essentialCount = 0;
            int preferredCount = 0;
            for (JobPosting posting : postings) {
                MentionField field = CertificationTextMatcher.classify(
                        certification.getName(),
                        posting.getApplicationQualification(),
                        posting.getPreferenceDetail());
                if (field == MentionField.NONE) {
                    field = llmMatchesByPostingAndCertification
                            .getOrDefault(posting.getId(), Map.of())
                            .getOrDefault(certification.getId(), MentionField.NONE);
                }
                if (field == MentionField.QUALIFICATION) {
                    essentialCount++;
                } else if (field == MentionField.PREFERENCE) {
                    preferredCount++;
                }
            }

            CertificationMention mention = existingByCertificationId.get(certification.getId());
            if (mention == null) {
                mention = CertificationMention.builder()
                        .certification(certification)
                        .jobTitle(jobTitle)
                        .build();
            }
            mention.setTotalPostingCount(total);
            mention.setMentionCount(essentialCount + preferredCount);
            mention.setEssentialMentionCount(essentialCount);
            mention.setPreferredMentionCount(preferredCount);
            certificationMentionRepository.save(mention);
        }
    }

    private Map<Long, Map<Long, MentionField>> loadLlmMatches(String jobTitle) {
        Map<Long, Map<Long, MentionField>> byPostingAndCertification = new HashMap<>();
        for (CertificationLlmMatch match : certificationLlmMatchRepository.findByJobPostingJobTitle(jobTitle)) {
            byPostingAndCertification
                    .computeIfAbsent(match.getJobPosting().getId(), id -> new HashMap<>())
                    .put(match.getCertification().getId(), match.getMentionField());
        }
        return byPostingAndCertification;
    }
}

package com.punchman.devpulse.service;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.normalizer.CertificationTextMatcher;
import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
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
 */
@Service
@RequiredArgsConstructor
public class CertificationMentionRecalculationService {

    private final JobPostingRepository jobPostingRepository;
    private final CertificationMentionRepository certificationMentionRepository;
    private final CertificationRepository certificationRepository;

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

        for (Certification certification : certificationRepository.findAll()) {
            int essentialCount = 0;
            int preferredCount = 0;
            for (JobPosting posting : postings) {
                MentionField field = CertificationTextMatcher.classify(
                        certification.getName(),
                        posting.getApplicationQualification(),
                        posting.getPreferenceDetail());
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
}

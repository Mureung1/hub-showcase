package com.punchman.devpulse.service;

import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationRankingService {

    private static final double ESSENTIAL_THRESHOLD = 0.5;
    private static final double PREFERRED_THRESHOLD = 0.2;

    private final CertificationMentionRepository certificationMentionRepository;

    @Transactional(readOnly = true)
    public List<CertificationRankingResult> rankByJobTitle(String jobTitle) {
        List<CertificationMention> mentions = certificationMentionRepository.findByJobTitle(jobTitle);
        if (mentions.isEmpty()) {
            throw new CertificationRankingNotFoundException(jobTitle);
        }
        return mentions.stream()
                .map(this::toResult)
                .sorted(Comparator.comparingDouble(CertificationRankingResult::mentionRate).reversed())
                .toList();
    }

    private CertificationRankingResult toResult(CertificationMention mention) {
        double rate = mention.getMentionCount() / (double) mention.getTotalPostingCount();
        return new CertificationRankingResult(
                mention.getCertification().getName(),
                mention.getCertification().getIssuer(),
                mention.getMentionCount(),
                mention.getTotalPostingCount(),
                rate,
                resolveEmphasis(rate)
        );
    }

    private EmphasisLevel resolveEmphasis(double rate) {
        if (rate >= ESSENTIAL_THRESHOLD) {
            return EmphasisLevel.ESSENTIAL;
        }
        if (rate >= PREFERRED_THRESHOLD) {
            return EmphasisLevel.PREFERRED;
        }
        return EmphasisLevel.LOW;
    }
}

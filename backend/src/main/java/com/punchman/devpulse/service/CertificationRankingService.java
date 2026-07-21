package com.punchman.devpulse.service;

import com.punchman.devpulse.repository.mybatis.CertificationMentionAggregateRow;
import com.punchman.devpulse.repository.mybatis.CertificationMentionMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationRankingService {

    private static final double ESSENTIAL_THRESHOLD = 0.5;
    private static final double PREFERRED_THRESHOLD = 0.2;

    private final CertificationMentionMapper certificationMentionMapper;

    @Transactional(readOnly = true)
    public List<CertificationRankingResult> rankByJobTitle(String jobTitle) {
        List<CertificationMentionAggregateRow> rows = certificationMentionMapper.findRankingByJobTitle(jobTitle);
        if (rows.isEmpty()) {
            throw new CertificationRankingNotFoundException(jobTitle);
        }
        return rows.stream()
                .map(this::toResult)
                .toList();
    }

    private CertificationRankingResult toResult(CertificationMentionAggregateRow row) {
        return new CertificationRankingResult(
                row.certificationName(),
                row.issuer(),
                row.mentionCount(),
                row.totalPostingCount(),
                row.mentionRate(),
                resolveEmphasis(row.mentionRate())
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

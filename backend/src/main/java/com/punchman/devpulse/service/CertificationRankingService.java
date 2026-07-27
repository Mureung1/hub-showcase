package com.punchman.devpulse.service;

import com.punchman.devpulse.repository.mybatis.CertificationMentionAggregateRow;
import com.punchman.devpulse.repository.mybatis.CertificationMentionMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationRankingService {

    private final CertificationMentionMapper certificationMentionMapper;

    @Transactional(readOnly = true)
    public List<CertificationRankingResult> rankByJobTitle(String jobTitle) {
        List<CertificationMentionAggregateRow> rows = certificationMentionMapper.findRankingByJobTitle(jobTitle);
        if (rows.isEmpty()) {
            throw new CertificationRankingNotFoundException(jobTitle);
        }

        // rows는 이미 mentionRate DESC(+ 이름 tie-breaker)로 정렬돼 있으므로 첫 행이 최댓값이다.
        int topMentionCount = rows.get(0).mentionCount();
        List<CertificationRankingResult> results = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            results.add(toResult(rows.get(i), i + 1, topMentionCount));
        }
        return results;
    }

    private CertificationRankingResult toResult(CertificationMentionAggregateRow row, int rank, int topMentionCount) {
        return new CertificationRankingResult(
                row.certificationName(),
                row.issuer(),
                row.mentionCount(),
                row.totalPostingCount(),
                row.mentionRate(),
                resolveEmphasis(row.essentialMentionCount(), row.preferredMentionCount()),
                row.essentialMentionCount(),
                row.preferredMentionCount(),
                rank,
                topRelativeRatio(row.mentionCount(), topMentionCount),
                row.llmAssisted()
        );
    }

    /**
     * 강조도는 언급률 임계치가 아니라 공고 문맥(자격요건 vs 우대사항) 실측값으로 판정한다 —
     * 자격요건란에 한 번이라도 등장하면 필수, 우대사항에만 등장하면 우대, 둘 다 없으면 낮음.
     */
    private EmphasisLevel resolveEmphasis(int essentialMentionCount, int preferredMentionCount) {
        if (essentialMentionCount > 0) {
            return EmphasisLevel.ESSENTIAL;
        }
        if (preferredMentionCount > 0) {
            return EmphasisLevel.PREFERRED;
        }
        return EmphasisLevel.LOW;
    }

    /**
     * 같은 jobTitle 검색 결과 안에서 1위(최댓값) 대비 비율. topMentionCount가 0이면(전원 0건)
     * 나눌 대상이 없으므로 0으로 나누기 없이 0을 반환한다.
     */
    private double topRelativeRatio(int mentionCount, int topMentionCount) {
        return topMentionCount == 0 ? 0.0 : (double) mentionCount / topMentionCount;
    }
}

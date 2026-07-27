package com.punchman.devpulse.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.punchman.devpulse.repository.mybatis.CertificationMentionAggregateRow;
import com.punchman.devpulse.repository.mybatis.CertificationMentionMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * 강조도는 언급률 임계치가 아니라 공고 문맥(essential/preferred 실측값)으로 판정한다.
 * rank/topRelativeRatio는 같은 jobTitle 결과 리스트 전체의 컨텍스트(1위 mentionCount)가
 * 있어야 계산되므로, mapper가 이미 mentionRate DESC로 정렬해 반환한다는 전제를 그대로
 * 목(mock)에 반영해 여러 행을 함께 스텁한다.
 */
class CertificationRankingServiceTest {

    private final CertificationMentionMapper certificationMentionMapper = mock(CertificationMentionMapper.class);
    private final CertificationRankingService service = new CertificationRankingService(certificationMentionMapper);

    @Test
    void essentialMentionPresentResolvesToEssentialRegardlessOfPreferred() {
        CertificationRankingResult result = rankSingleRow(row("A", 90, 5, 3));

        assertThat(result.emphasis()).isEqualTo(EmphasisLevel.ESSENTIAL);
    }

    @Test
    void onlyPreferredMentionResolvesToPreferred() {
        CertificationRankingResult result = rankSingleRow(row("A", 90, 0, 4));

        assertThat(result.emphasis()).isEqualTo(EmphasisLevel.PREFERRED);
    }

    @Test
    void noEssentialOrPreferredMentionResolvesToLow() {
        CertificationRankingResult result = rankSingleRow(row("A", 90, 0, 0));

        assertThat(result.emphasis()).isEqualTo(EmphasisLevel.LOW);
    }

    @Test
    void rankAndTopRelativeRatioComputedAcrossMultipleRows() {
        List<CertificationRankingResult> results = rankRows(
                row("1위자격증", 10, 6, 2),
                row("2위자격증", 10, 3, 1),
                row("3위자격증", 10, 0, 0));

        assertThat(results.get(0).rank()).isEqualTo(1);
        assertThat(results.get(0).topRelativeRatio()).isCloseTo(1.0, within(0.0001));

        assertThat(results.get(1).rank()).isEqualTo(2);
        assertThat(results.get(1).topRelativeRatio()).isCloseTo(4.0 / 8.0, within(0.0001));

        assertThat(results.get(2).rank()).isEqualTo(3);
        assertThat(results.get(2).topRelativeRatio()).isCloseTo(0.0, within(0.0001));
    }

    @Test
    void allZeroMentionsAvoidsDivisionByZeroAndStaysLow() {
        List<CertificationRankingResult> results = rankRows(
                row("A", 10, 0, 0),
                row("B", 10, 0, 0));

        assertThat(results).allSatisfy(result -> {
            assertThat(result.topRelativeRatio()).isEqualTo(0.0);
            assertThat(result.emphasis()).isEqualTo(EmphasisLevel.LOW);
        });
        assertThat(results.get(0).rank()).isEqualTo(1);
        assertThat(results.get(1).rank()).isEqualTo(2);
    }

    @Test
    void singleRowIsRankOneAtFullRelativeRatio() {
        CertificationRankingResult result = rankSingleRow(row("A", 10, 3, 0));

        assertThat(result.rank()).isEqualTo(1);
        assertThat(result.topRelativeRatio()).isCloseTo(1.0, within(0.0001));
    }

    @Test
    void essentialAndPreferredCountsPassThroughUnchanged() {
        CertificationRankingResult result = rankSingleRow(row("A", 100, 7, 3));

        assertThat(result.essentialMentionCount()).isEqualTo(7);
        assertThat(result.preferredMentionCount()).isEqualTo(3);
    }

    @Test
    void llmAssistedFlagPassesThroughUnchanged() {
        CertificationRankingResult result = rankSingleRow(row("A", 100, 0, 1, true));

        assertThat(result.llmAssisted()).isTrue();
    }

    @Test
    void emptyRankingThrowsNotFound() {
        when(certificationMentionMapper.findRankingByJobTitle("존재하지않는직무")).thenReturn(List.of());

        assertThatThrownBy(() -> service.rankByJobTitle("존재하지않는직무"))
                .isInstanceOf(CertificationRankingNotFoundException.class);
    }

    private CertificationRankingResult rankSingleRow(CertificationMentionAggregateRow row) {
        return rankRows(row).get(0);
    }

    private List<CertificationRankingResult> rankRows(CertificationMentionAggregateRow... rows) {
        when(certificationMentionMapper.findRankingByJobTitle("테스트직무")).thenReturn(List.of(rows));
        return service.rankByJobTitle("테스트직무");
    }

    private CertificationMentionAggregateRow row(String certificationName, int totalPostingCount,
            int essential, int preferred) {
        return row(certificationName, totalPostingCount, essential, preferred, false);
    }

    private CertificationMentionAggregateRow row(String certificationName, int totalPostingCount,
            int essential, int preferred, boolean llmAssisted) {
        int mentionCount = essential + preferred;
        double mentionRate = totalPostingCount == 0 ? 0.0 : (double) mentionCount / totalPostingCount;
        return new CertificationMentionAggregateRow(
                certificationName, "테스트발급기관", mentionCount, totalPostingCount, mentionRate, essential, preferred,
                llmAssisted);
    }
}

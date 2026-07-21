package com.punchman.devpulse.repository.mybatis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.punchman.devpulse.bootstrap.DevpulseApplication;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * V2__seed.sql 시드 데이터를 전제로 하는 통합 테스트. 로컬 docker-compose Postgres(포트 5433)가
 * 기동돼 있어야 통과한다 (프로젝트의 기존 DB 의존 검증 패턴을 따름 — Testcontainers 등 신규 의존성 없음).
 * bootstrap 패키지가 repository.mybatis의 상위 패키지가 아니라서 @SpringBootTest의 기본 탐색으로는
 * @SpringBootConfiguration을 못 찾으므로 classes를 명시한다.
 */
@SpringBootTest(classes = DevpulseApplication.class)
class CertificationMentionMapperTest {

    @Autowired
    private CertificationMentionMapper mapper;

    @Test
    void rankingForSemiconductorQualityManagementReturnsFiveRowsOrderedByMentionRateDesc() {
        List<CertificationMentionAggregateRow> rows = mapper.findRankingByJobTitle("반도체 품질관리");

        assertThat(rows).hasSize(5);
        assertThat(rows).isSortedAccordingTo(
                Comparator.comparingDouble(CertificationMentionAggregateRow::mentionRate).reversed());

        CertificationMentionAggregateRow top = rows.get(0);
        assertThat(top.certificationName()).isEqualTo("산업안전기사");
        assertThat(top.issuer()).isEqualTo("한국산업인력공단");
        assertThat(top.mentionCount()).isEqualTo(94);
        assertThat(top.totalPostingCount()).isEqualTo(120);
        assertThat(top.mentionRate()).isCloseTo(94.0 / 120.0, within(0.0001));
    }

    @Test
    void rankingForItJobReturnsFiveRowsWithExactMentionRate() {
        List<CertificationMentionAggregateRow> rows = mapper.findRankingByJobTitle("전산직");

        assertThat(rows).hasSize(5);

        CertificationMentionAggregateRow top = rows.get(0);
        assertThat(top.certificationName()).isEqualTo("정보처리기사");
        assertThat(top.mentionRate()).isCloseTo(0.65, within(0.0001));
    }

    @Test
    void rankingForUnknownJobTitleReturnsEmptyList() {
        List<CertificationMentionAggregateRow> rows = mapper.findRankingByJobTitle("존재하지않는직무");

        assertThat(rows).isEmpty();
    }
}

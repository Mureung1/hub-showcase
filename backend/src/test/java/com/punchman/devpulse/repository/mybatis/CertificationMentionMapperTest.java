package com.punchman.devpulse.repository.mybatis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.punchman.devpulse.bootstrap.DevpulseApplication;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 이 테스트 전용 fixture(@BeforeEach/@AfterEach)를 사용하는 통합 테스트, 실제 seed/운영
 * job_title과 무관하다 — job_title이 V2__seed.sql의 시드값과 같으면, AlioJobTitleNcsMapping이
 * "반도체 품질관리"/"전산직"을 실제 ALIO 수집 대상으로도 매핑하고 있어 실수집 때마다
 * certification_mention이 실데이터로 덮어써지며 이 테스트가 깨졌다(Issue 12). 로컬
 * docker-compose Postgres(포트 5433)가 기동돼 있어야 통과한다 (프로젝트의 기존 DB 의존 검증
 * 패턴을 따름 — Testcontainers 등 신규 의존성 없음). bootstrap 패키지가 repository.mybatis의
 * 상위 패키지가 아니라서 @SpringBootTest의 기본 탐색으로는 @SpringBootConfiguration을 못
 * 찾으므로 classes를 명시한다.
 */
@SpringBootTest(classes = DevpulseApplication.class)
class CertificationMentionMapperTest {

    private static final String TEST_JOB_TITLE_A = "테스트직무-mention랭킹A";
    private static final String TEST_JOB_TITLE_B = "테스트직무-mention랭킹B";

    @Autowired
    private CertificationMentionMapper mapper;

    @Autowired
    private CertificationMentionRepository certificationMentionRepository;

    @Autowired
    private CertificationRepository certificationRepository;

    @BeforeEach
    void seedFixture() {
        seedMention(TEST_JOB_TITLE_A, "산업안전기사", 120, 94);
        seedMention(TEST_JOB_TITLE_A, "품질경영기사", 120, 54);
        seedMention(TEST_JOB_TITLE_A, "위험물산업기사", 120, 36);
        seedMention(TEST_JOB_TITLE_A, "컴퓨터활용능력 1급", 120, 14);
        seedMention(TEST_JOB_TITLE_A, "정보처리기사", 120, 8);

        seedMention(TEST_JOB_TITLE_B, "정보처리기사", 80, 52);
        seedMention(TEST_JOB_TITLE_B, "컴퓨터활용능력 1급", 80, 40);
        seedMention(TEST_JOB_TITLE_B, "SQLD", 80, 28);
        seedMention(TEST_JOB_TITLE_B, "리눅스마스터 1급", 80, 12);
        seedMention(TEST_JOB_TITLE_B, "산업안전기사", 80, 2);
    }

    @AfterEach
    void cleanUp() {
        certificationMentionRepository.deleteAll(certificationMentionRepository.findByJobTitle(TEST_JOB_TITLE_A));
        certificationMentionRepository.deleteAll(certificationMentionRepository.findByJobTitle(TEST_JOB_TITLE_B));
    }

    private void seedMention(String jobTitle, String certificationName, int totalPostingCount, int mentionCount) {
        Certification certification = certificationRepository.findAll().stream()
                .filter(c -> certificationName.equals(c.getName()))
                .findFirst()
                .orElseThrow();
        certificationMentionRepository.save(CertificationMention.builder()
                .certification(certification)
                .jobTitle(jobTitle)
                .totalPostingCount(totalPostingCount)
                .mentionCount(mentionCount)
                .build());
    }

    @Test
    void rankingForSemiconductorQualityManagementReturnsFiveRowsOrderedByMentionRateDesc() {
        List<CertificationMentionAggregateRow> rows = mapper.findRankingByJobTitle(TEST_JOB_TITLE_A);

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
        List<CertificationMentionAggregateRow> rows = mapper.findRankingByJobTitle(TEST_JOB_TITLE_B);

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

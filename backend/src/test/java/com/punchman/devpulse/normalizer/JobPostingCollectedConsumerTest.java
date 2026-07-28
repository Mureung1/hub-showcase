package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.bootstrap.DevpulseApplication;
import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;

/**
 * 실제 로컬 docker-compose Kafka+Postgres 대상 통합 테스트(Testcontainers 등 신규 의존성 없음,
 * Issue 8/9와 동일 컨벤션). 프로듀서로 이벤트를 발행해 실제 컨슈머가 DB에 저장 + 룰 기반
 * certification_mention 재계산까지 하는지 끝까지 확인한다.
 */
@SpringBootTest(classes = DevpulseApplication.class)
class JobPostingCollectedConsumerTest {

    private static final String TEST_RECRUIT_NO = "TEST-JOBPOSTING-CONSUMER-1";
    private static final String TEST_JOB_TITLE = "테스트직무-consumer";
    private static final String FAILING_RECRUIT_NO = "TEST-JOBPOSTING-CONSUMER-ERRORHANDLING-FAIL";
    private static final String FAILING_JOB_TITLE = "테스트직무-consumer-errorhandling-fail";
    private static final String RECOVERY_RECRUIT_NO = "TEST-JOBPOSTING-CONSUMER-ERRORHANDLING-RECOVERY";
    private static final String RECOVERY_JOB_TITLE = "테스트직무-consumer-errorhandling-recovery";

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JobPostingRepository jobPostingRepository;

    @Autowired
    private CertificationMentionRepository certificationMentionRepository;

    @Autowired
    private CertificationRepository certificationRepository;

    @AfterEach
    void cleanUp() {
        jobPostingRepository.findByRecruitAnnouncementNoAndJobTitle(TEST_RECRUIT_NO, TEST_JOB_TITLE)
                .ifPresent(jobPostingRepository::delete);
        certificationMentionRepository.deleteAll(certificationMentionRepository.findByJobTitle(TEST_JOB_TITLE));
        jobPostingRepository.findByRecruitAnnouncementNoAndJobTitle(FAILING_RECRUIT_NO, FAILING_JOB_TITLE)
                .ifPresent(jobPostingRepository::delete);
        jobPostingRepository.findByRecruitAnnouncementNoAndJobTitle(RECOVERY_RECRUIT_NO, RECOVERY_JOB_TITLE)
                .ifPresent(jobPostingRepository::delete);
        certificationMentionRepository.deleteAll(certificationMentionRepository.findByJobTitle(FAILING_JOB_TITLE));
        certificationMentionRepository.deleteAll(certificationMentionRepository.findByJobTitle(RECOVERY_JOB_TITLE));
    }

    @Test
    void publishedEventIsIngestedAndCertificationMentionIsRecalculated() throws Exception {
        JobPostingCollectedEvent event = new JobPostingCollectedEvent(
                TEST_JOB_TITLE,
                TEST_RECRUIT_NO,
                "테스트 공고 제목",
                "테스트기관",
                "응시자격 원문",
                "우대조건 요약",
                "SQLD 자격증 소지자 우대",
                "NCS분류",
                "Y",
                "20260601",
                "20260801");

        kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, objectMapper.writeValueAsString(event));

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            Optional<JobPosting> saved = jobPostingRepository
                    .findByRecruitAnnouncementNoAndJobTitle(TEST_RECRUIT_NO, TEST_JOB_TITLE);
            assertThat(saved).isPresent();
            assertThat(saved.get().getTitle()).isEqualTo("테스트 공고 제목");
            assertThat(saved.get().isOngoing()).isTrue();

            Long sqldId = certificationRepository.findAll().stream()
                    .filter(c -> "SQLD".equals(c.getName()))
                    .findFirst().orElseThrow().getId();

            // getCertification().getId()는 프록시를 초기화하지 않고 FK 값만 읽으므로
            // 세션이 닫힌 뒤에도 LazyInitializationException 없이 안전하게 비교 가능.
            List<CertificationMention> mentions = certificationMentionRepository.findByJobTitle(TEST_JOB_TITLE);
            assertThat(mentions).isNotEmpty();
            assertThat(mentions).allSatisfy(m -> assertThat(m.getTotalPostingCount()).isEqualTo(1));

            CertificationMention sqld = mentions.stream()
                    .filter(m -> sqldId.equals(m.getCertification().getId()))
                    .findFirst().orElseThrow();
            assertThat(sqld.getMentionCount()).isEqualTo(1);
            // 이벤트의 SQLD는 preferenceDetail("SQLD 자격증 소지자 우대")에만 있고
            // applicationQualification("응시자격 원문")엔 없음 — 우대 문맥으로 분류돼야 한다.
            assertThat(sqld.getEssentialMentionCount()).isEqualTo(0);
            assertThat(sqld.getPreferredMentionCount()).isEqualTo(1);

            long zeroMentionCount = mentions.stream()
                    .filter(m -> !sqldId.equals(m.getCertification().getId()))
                    .filter(m -> m.getMentionCount() == 0)
                    .count();
            assertThat(zeroMentionCount).isEqualTo(mentions.size() - 1);
        });
    }

    /**
     * ingest()는 (recruitAnnouncementNo, jobTitle) upsert, recalculate()는 매번 전체
     * 재계산(덮어쓰기)이라 같은 이벤트가 중복 처리돼도 최종 상태는 1회 처리했을 때와
     * 같아야 한다 — Kafka 재시도/재전송 상황에서의 안전망.
     */
    @Test
    void duplicateEventIsProcessedIdempotently() throws Exception {
        JobPostingCollectedEvent event = new JobPostingCollectedEvent(
                TEST_JOB_TITLE,
                TEST_RECRUIT_NO,
                "테스트 공고 제목",
                "테스트기관",
                "응시자격 원문",
                "우대조건 요약",
                "SQLD 자격증 소지자 우대",
                "NCS분류",
                "Y",
                "20260601",
                "20260801");
        String payload = objectMapper.writeValueAsString(event);

        kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, payload);
        kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, payload);

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            List<JobPosting> matching = jobPostingRepository.findByJobTitle(TEST_JOB_TITLE);
            assertThat(matching).hasSize(1);

            Long sqldId = certificationRepository.findAll().stream()
                    .filter(c -> "SQLD".equals(c.getName()))
                    .findFirst().orElseThrow().getId();

            List<CertificationMention> mentions = certificationMentionRepository.findByJobTitle(TEST_JOB_TITLE);
            CertificationMention sqld = mentions.stream()
                    .filter(m -> sqldId.equals(m.getCertification().getId()))
                    .findFirst().orElseThrow();
            // 이벤트를 2번 보내도 총계는 공고 1건 기준과 동일해야 한다(멱등성).
            assertThat(sqld.getTotalPostingCount()).isEqualTo(1);
            assertThat(sqld.getMentionCount()).isEqualTo(1);
            assertThat(sqld.getEssentialMentionCount()).isEqualTo(0);
            assertThat(sqld.getPreferredMentionCount()).isEqualTo(1);
        });
    }

    /**
     * KafkaTopicConfig에 등록한 명시적 DefaultErrorHandler(FixedBackOff(1000, 2))가 실제로
     * 동작하는지 확인한다. title 컬럼은 VARCHAR(500)이라 501자 이상을 보내면 저장 시마다
     * 실제 제약 위반으로 계속 실패한다(mock 없이 진짜 DB 제약으로 재현). 정확한 재시도
     * 횟수는 스프링 카프카 프레임워크 내부 구현이라 검증 범위 밖으로 두고, 우리가 신경 쓸
     * 지점(스킵 후에도 컨슈머가 죽지 않고 다음 메시지를 정상 처리하는지)만 확인한다.
     */
    @Test
    void persistentFailureIsSkippedWithoutKillingConsumer() throws Exception {
        String tooLongTitle = "가".repeat(501);
        JobPostingCollectedEvent poisonEvent = new JobPostingCollectedEvent(
                FAILING_JOB_TITLE,
                FAILING_RECRUIT_NO,
                tooLongTitle,
                "테스트기관",
                "응시자격 원문",
                "우대조건 요약",
                "SQLD 자격증 소지자 우대",
                "NCS분류",
                "Y",
                "20260601",
                "20260801");
        kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, objectMapper.writeValueAsString(poisonEvent));

        JobPostingCollectedEvent recoveryEvent = new JobPostingCollectedEvent(
                RECOVERY_JOB_TITLE,
                RECOVERY_RECRUIT_NO,
                "테스트 공고 제목",
                "테스트기관",
                "응시자격 원문",
                "우대조건 요약",
                "SQLD 자격증 소지자 우대",
                "NCS분류",
                "Y",
                "20260601",
                "20260801");
        kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, objectMapper.writeValueAsString(recoveryEvent));

        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            // 계속 실패하는 메시지는 재시도가 소진된 뒤 스킵되어 끝내 저장되지 않아야 한다.
            assertThat(jobPostingRepository
                    .findByRecruitAnnouncementNoAndJobTitle(FAILING_RECRUIT_NO, FAILING_JOB_TITLE))
                    .isEmpty();
            // 스킵된 뒤에도 컨슈머 컨테이너가 살아있어야 다음 메시지가 정상 처리된다.
            assertThat(jobPostingRepository
                    .findByRecruitAnnouncementNoAndJobTitle(RECOVERY_RECRUIT_NO, RECOVERY_JOB_TITLE))
                    .isPresent();
        });
    }
}

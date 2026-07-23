package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.bootstrap.DevpulseApplication;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;

/**
 * 실제 로컬 docker-compose Kafka+Postgres 대상 통합 테스트(Testcontainers 등 신규 의존성 없음,
 * Issue 8/9와 동일 컨벤션). 프로듀서로 이벤트를 발행해 실제 컨슈머가 DB에 저장하는지 끝까지 확인한다.
 */
@SpringBootTest(classes = DevpulseApplication.class)
class JobPostingCollectedConsumerTest {

    private static final String TEST_RECRUIT_NO = "TEST-JOBPOSTING-CONSUMER-1";
    private static final String TEST_JOB_TITLE = "테스트직무-consumer";

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JobPostingRepository jobPostingRepository;

    @AfterEach
    void cleanUp() {
        jobPostingRepository.findByRecruitAnnouncementNoAndJobTitle(TEST_RECRUIT_NO, TEST_JOB_TITLE)
                .ifPresent(jobPostingRepository::delete);
    }

    @Test
    void publishedEventIsIngestedIntoJobPosting() throws Exception {
        JobPostingCollectedEvent event = new JobPostingCollectedEvent(
                TEST_JOB_TITLE,
                TEST_RECRUIT_NO,
                "테스트 공고 제목",
                "테스트기관",
                "응시자격 원문",
                "우대조건 요약",
                "우대사항 상세",
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
        });
    }
}

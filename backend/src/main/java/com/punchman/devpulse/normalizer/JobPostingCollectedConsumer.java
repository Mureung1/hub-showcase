package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import com.punchman.devpulse.service.CertificationMentionRecalculationService;
import com.punchman.devpulse.service.JobPostingIngestService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * 원문을 JobPosting으로 저장하고, 룰 기반 최소 정규화(CertificationTextMatcher)로
 * certification_mention을 재계산한다. LLM 기반 정규화(Issue 16)는 이 실시간 Kafka 경로에는
 * 들어오지 않음 — 완전히 분리된 별도 엔드포인트(CertificationLlmNormalizationController)에서만
 * 배치로 호출된다("실시간 스트리밍 금지" 원칙).
 *
 * !prod 전용 — prod 프로필(무료 배포 환경, Kafka 없음)에서는 이 빈 자체가 등록되지 않고
 * DirectJobPostingEventPublisher가 같은 로직을 동기로 대신한다.
 */
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class JobPostingCollectedConsumer {

    private static final Logger log = LoggerFactory.getLogger(JobPostingCollectedConsumer.class);

    private final ObjectMapper objectMapper;
    private final JobPostingIngestService jobPostingIngestService;
    private final CertificationMentionRecalculationService certificationMentionRecalculationService;

    @KafkaListener(topics = KafkaTopics.JOBPOSTING_COLLECTED, groupId = "devpulse")
    public void onMessage(String message) {
        JobPostingCollectedEvent event;
        try {
            event = objectMapper.readValue(message, JobPostingCollectedEvent.class);
        } catch (Exception e) {
            log.error("jobposting.collected 메시지 역직렬화 실패, 무시함: {}", message, e);
            return;
        }
        jobPostingIngestService.ingest(event);
        certificationMentionRecalculationService.recalculate(event.jobTitle());
        log.info("공고 저장 완료: recrutPblntSn={}, jobTitle={}", event.recrutPblntSn(), event.jobTitle());
    }
}

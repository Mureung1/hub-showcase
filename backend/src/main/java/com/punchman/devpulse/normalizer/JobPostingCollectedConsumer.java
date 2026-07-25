package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import com.punchman.devpulse.service.CertificationMentionRecalculationService;
import com.punchman.devpulse.service.JobPostingIngestService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * 원문을 JobPosting으로 저장하고, 룰 기반 최소 정규화(CertificationTextMatcher)로
 * certification_mention을 재계산한다. LLM 기반 정규화(FR-2 원안)는 범위 밖.
 */
@Component
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

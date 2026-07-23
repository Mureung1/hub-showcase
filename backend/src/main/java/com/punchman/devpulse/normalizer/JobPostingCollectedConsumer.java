package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import com.punchman.devpulse.service.JobPostingIngestService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * 원문을 JobPosting으로 저장하는 것까지만 담당한다. 자격증 추출(정규화)은 다음 이슈에서
 * preferenceDetail(prefCn 원문)을 대상으로 별도 구현한다.
 */
@Component
@RequiredArgsConstructor
public class JobPostingCollectedConsumer {

    private static final Logger log = LoggerFactory.getLogger(JobPostingCollectedConsumer.class);

    private final ObjectMapper objectMapper;
    private final JobPostingIngestService jobPostingIngestService;

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
        log.info("공고 저장 완료: recrutPblntSn={}, jobTitle={}", event.recrutPblntSn(), event.jobTitle());
    }
}

package com.punchman.devpulse.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * 로컬(비-prod) 프로필 전용 — 이벤트를 JSON으로 직렬화해 jobposting.collected 토픽에 발행한다.
 * prod 프로필에서는 DirectJobPostingEventPublisher가 Kafka 없이 동기로 대체한다.
 */
@Component
@Profile("!prod")
public class KafkaJobPostingEventPublisher implements JobPostingEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public KafkaJobPostingEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(JobPostingCollectedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JobPostingCollectedEvent 직렬화 실패", e);
        }
    }
}

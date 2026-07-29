package com.punchman.devpulse.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic jobPostingCollectedTopic() {
        return TopicBuilder.name(KafkaTopics.JOBPOSTING_COLLECTED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    /**
     * 프레임워크 기본값(FixedBackOff(0, 9) — 즉시 9회 재시도 후 조용히 스킵)을 의도적인
     * 값으로 교체. 1초 간격으로 2회 재시도한 뒤에도 실패하면 스킵하고 다음 메시지로 넘어간다.
     * DLQ는 두지 않음 — 이 규모(단일 인스턴스, 수십~백 건)에서는 재수집 API
     * (POST /api/job-postings/collect)가 이미 실질적인 복구 수단이라 별도 격리 큐를 볼
     * 대상이 없다.
     */
    @Bean
    public CommonErrorHandler kafkaErrorHandler() {
        return new DefaultErrorHandler(new FixedBackOff(1000L, 2));
    }
}
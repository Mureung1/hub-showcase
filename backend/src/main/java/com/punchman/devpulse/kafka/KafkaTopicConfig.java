package com.punchman.devpulse.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic jobPostingCollectedTopic() {
        return TopicBuilder.name(KafkaTopics.JOBPOSTING_COLLECTED)
                .partitions(1)
                .replicas(1)
                .build();
    }
}

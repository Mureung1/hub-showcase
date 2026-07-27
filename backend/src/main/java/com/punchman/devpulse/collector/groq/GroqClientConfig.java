package com.punchman.devpulse.collector.groq;

import feign.Feign;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GroqClientConfig {

    private static final String GROQ_BASE_URL = "https://api.groq.com";

    @Bean
    public GroqChatClient groqChatClient() {
        return Feign.builder().target(GroqChatClient.class, GROQ_BASE_URL);
    }
}

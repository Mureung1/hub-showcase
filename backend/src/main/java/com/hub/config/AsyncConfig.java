package com.hub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * F6 AI 문서 생성용 잡 풀.
 * LLM 호출은 수십 초가 걸리므로 요청 스레드를 잡아두지 않는다.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "llmExecutor")
    public Executor llmExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("llm-");
        executor.initialize();
        return executor;
    }
}

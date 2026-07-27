package com.hub.document;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(
        String apiKey,
        String model,
        String baseUrl,
        int maxTokens
) {}
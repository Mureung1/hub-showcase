package com.spendmate.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class AgentClient {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-sonnet-5";

    @Value("${claude.api-key}")
    private String apiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl(API_URL)
            .build();

    public record ContentBlock(String type, String text, String id, String name, Map<String, Object> input) {}
    public record ClaudeResponse(String stopReason, List<ContentBlock> content) {}

    @SuppressWarnings("unchecked")
    public ClaudeResponse sendMessage(String systemPrompt, String userMessage, List<Map<String, Object>> tools) {
        Map<String, Object> requestBody = Map.of(
                "model", MODEL,
                "max_tokens", 1024,
                "system", systemPrompt,
                "tools", tools,
                "messages", List.of(Map.of("role", "user", "content", userMessage))
        );

        Map<String, Object> response = webClient.post()
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String stopReason = (String) response.get("stop_reason");
        List<Map<String, Object>> rawContent = (List<Map<String, Object>>) response.get("content");
        List<ContentBlock> content = rawContent.stream()
                .map(block -> new ContentBlock(
                        (String) block.get("type"),
                        (String) block.get("text"),
                        (String) block.get("id"),
                        (String) block.get("name"),
                        (Map<String, Object>) block.get("input")
                ))
                .toList();

        return new ClaudeResponse(stopReason, content);
    }
}
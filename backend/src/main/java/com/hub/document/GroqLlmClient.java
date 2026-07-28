package com.hub.document;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * realllm 프로파일에서 붙는 Groq 호출 구현.
 * Groq 는 OpenAI 호환 API 라 요청/응답 형태가 Anthropic 과 다르다.
 *   요청: POST /v1/chat/completions  { model, messages, max_tokens }
 *   응답: { "choices": [ { "message": { "content": "..." } } ] }
 */
@Slf4j
@Component
@Profile("realllm")
public class GroqLlmClient implements LlmClient {

    private final RestClient client;
    private final LlmProperties props;

    public GroqLlmClient(LlmProperties props) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "GROQ_API_KEY 가 설정되지 않았습니다. 실행 구성의 환경 변수로 주입하세요.");
        }
        this.props = props;
        this.client = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("Authorization", "Bearer " + props.apiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
        log.info("GroqLlmClient 초기화: model={}, baseUrl={}", props.model(), props.baseUrl());
    }

    @Override
    public String generate(String prompt) {
        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", props.maxTokens(),
                "messages", List.of(Map.of("role", "user", "content", prompt)));

        long startedAt = System.currentTimeMillis();
        JsonNode res = client.post()
                .uri("/v1/chat/completions")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        log.info("Groq 응답 수신: {}ms", System.currentTimeMillis() - startedAt);

        JsonNode choices = res.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            throw new IllegalStateException("LLM 응답에 choices 가 없습니다: " + res);
        }
        String content = choices.get(0).path("message").path("content").asText();
        if (content.isBlank()) {
            throw new IllegalStateException("LLM 응답 본문이 비어 있습니다: " + res);
        }
        return content;
    }
}

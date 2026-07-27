package com.hub.document;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/** 로컬이 아닐 때(실 프로필) 붙는 실제 Anthropic 호출 구현. */
@Slf4j
@Component
@Profile("!local")
public class AnthropicLlmClient implements LlmClient {

    private final RestClient client;
    private final LlmProperties props;

    public AnthropicLlmClient(LlmProperties props) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "ANTHROPIC_API_KEY 가 설정되지 않았습니다. 환경변수로 주입하세요.");
        }
        this.props = props;
        this.client = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("x-api-key", props.apiKey())
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("content-type", "application/json")
                .build();
    }

    @Override
    public String generate(String prompt) {
        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", props.maxTokens(),
                "messages", List.of(Map.of("role", "user", "content", prompt)));

        JsonNode res = client.post()
                .uri("/v1/messages")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        // 응답: { "content": [ { "type":"text", "text":"..." } ] }
        JsonNode content = res.path("content");
        if (!content.isArray() || content.isEmpty()) {
            throw new IllegalStateException("LLM 응답에 content 가 없습니다: " + res);
        }
        return content.get(0).path("text").asText();
    }
}
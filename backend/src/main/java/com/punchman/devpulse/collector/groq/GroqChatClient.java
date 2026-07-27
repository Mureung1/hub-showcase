package com.punchman.devpulse.collector.groq;

import feign.Headers;
import feign.Param;
import feign.RequestLine;

/**
 * vanilla feign-core 인터페이스(Spring Cloud OpenFeign 아님) — collector/alio와 동일 패턴.
 * 응답을 String으로 그대로 받아 커스텀 Decoder 없이 ObjectMapper로 직접 파싱한다(ALIO와 동일).
 */
public interface GroqChatClient {

    @RequestLine("POST /openai/v1/chat/completions")
    @Headers({
            "Content-Type: application/json",
            "Authorization: Bearer {apiKey}"
    })
    String chatCompletion(@Param("apiKey") String apiKey, String requestBody);
}

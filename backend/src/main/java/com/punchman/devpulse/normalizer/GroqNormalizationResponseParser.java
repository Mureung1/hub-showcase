package com.punchman.devpulse.normalizer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Groq(OpenAI 호환) chat completions 응답을 파싱한다. LLM 응답은 신뢰할 수 없는 입력으로
 * 취급 — 개별 항목이 이상하면(목록에 없는 postingIndex, JSON 파싱 실패 등) 그 항목만 버리고
 * 나머지는 정상 처리한다. 배치 전체를 실패시키지 않는다.
 */
public final class GroqNormalizationResponseParser {

    private static final Logger log = LoggerFactory.getLogger(GroqNormalizationResponseParser.class);

    private GroqNormalizationResponseParser() {
    }

    public static GroqNormalizationResult parse(ObjectMapper objectMapper, String rawHttpResponse) {
        String content = extractMessageContent(objectMapper, rawHttpResponse);
        if (content == null) {
            return new GroqNormalizationResult(List.of());
        }

        JsonNode resultsNode;
        try {
            resultsNode = objectMapper.readTree(content).path("results");
        } catch (Exception e) {
            log.warn("Groq 응답 content JSON 파싱 실패, 이번 배치는 매칭 없음으로 처리: {}", content, e);
            return new GroqNormalizationResult(List.of());
        }
        if (!resultsNode.isArray()) {
            log.warn("Groq 응답에 results 배열이 없음: {}", content);
            return new GroqNormalizationResult(List.of());
        }

        List<GroqNormalizationResult.PostingMatch> postingMatches = new ArrayList<>();
        for (JsonNode postingNode : resultsNode) {
            GroqNormalizationResult.PostingMatch match = parsePostingMatch(postingNode);
            if (match != null) {
                postingMatches.add(match);
            }
        }
        return new GroqNormalizationResult(postingMatches);
    }

    private static String extractMessageContent(ObjectMapper objectMapper, String rawHttpResponse) {
        try {
            JsonNode root = objectMapper.readTree(rawHttpResponse);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            return content.isTextual() ? content.asText() : null;
        } catch (Exception e) {
            log.warn("Groq HTTP 응답 파싱 실패: {}", rawHttpResponse, e);
            return null;
        }
    }

    private static GroqNormalizationResult.PostingMatch parsePostingMatch(JsonNode postingNode) {
        if (!postingNode.path("postingIndex").isInt()) {
            return null;
        }
        int postingIndex = postingNode.path("postingIndex").asInt();

        List<GroqNormalizationResult.CertificationMatch> matches = new ArrayList<>();
        for (JsonNode matchNode : postingNode.path("matches")) {
            String certificationName = matchNode.path("certificationName").asText(null);
            String field = matchNode.path("field").asText(null);
            if (certificationName == null || certificationName.isBlank() || field == null) {
                continue;
            }
            matches.add(new GroqNormalizationResult.CertificationMatch(certificationName, field));
        }
        return new GroqNormalizationResult.PostingMatch(postingIndex, matches);
    }
}

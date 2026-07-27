package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GroqNormalizationResponseParserTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesValidOpenAiCompatibleEnvelope() {
        String content = "{\"results\":[{\"postingIndex\":0,\"matches\":"
                + "[{\"certificationName\":\"SQLD\",\"field\":\"PREFERENCE\"}]}]}";
        String rawResponse = envelopeWith(content);

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);

        assertThat(result.results()).hasSize(1);
        assertThat(result.results().get(0).postingIndex()).isEqualTo(0);
        assertThat(result.results().get(0).matches()).containsExactly(
                new GroqNormalizationResult.CertificationMatch("SQLD", "PREFERENCE"));
    }

    @Test
    void malformedContentJsonReturnsEmptyResultInsteadOfThrowing() {
        String rawResponse = envelopeWith("이건 JSON이 아님");

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);

        assertThat(result.results()).isEmpty();
    }

    @Test
    void missingResultsArrayReturnsEmptyResult() {
        String rawResponse = envelopeWith("{\"somethingElse\": true}");

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);

        assertThat(result.results()).isEmpty();
    }

    @Test
    void matchWithoutCertificationNameIsSkippedButRestOfBatchSurvives() {
        String content = "{\"results\":[{\"postingIndex\":0,\"matches\":["
                + "{\"field\":\"QUALIFICATION\"},"
                + "{\"certificationName\":\"SQLD\",\"field\":\"PREFERENCE\"}"
                + "]}]}";
        String rawResponse = envelopeWith(content);

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);

        assertThat(result.results().get(0).matches()).containsExactly(
                new GroqNormalizationResult.CertificationMatch("SQLD", "PREFERENCE"));
    }

    @Test
    void completelyInvalidHttpResponseReturnsEmptyResult() {
        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, "not even json");

        assertThat(result.results()).isEmpty();
    }

    private String envelopeWith(String content) {
        try {
            return objectMapper.writeValueAsString(java.util.Map.of(
                    "choices", java.util.List.of(
                            java.util.Map.of("message", java.util.Map.of("content", content)))));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

package com.placepick.infrastructure.external;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

class ExternalApiSafetyFixtureTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExternalApiEndpointPolicy policy = new ExternalApiEndpointPolicy();

    @TestFactory
    List<DynamicTest> validatesEverySafetyFixture() throws IOException {
        List<SafetyFixture> fixtures = readFixtures();

        assertThat(fixtures).isNotEmpty();
        assertThat(fixtures).extracting(SafetyFixture::id).doesNotHaveDuplicates();

        return fixtures.stream()
            .map(fixture -> DynamicTest.dynamicTest(fixture.id(), () -> verifyFixture(fixture)))
            .toList();
    }

    private void verifyFixture(SafetyFixture fixture) {
        ExternalApiProperties properties = new ExternalApiProperties(
            fixture.mode(),
            URI.create(fixture.naverBaseUrl()),
            URI.create(fixture.llmBaseUrl())
        );

        if (fixture.accepted()) {
            assertThatCode(() -> policy.requireSafe(Set.of(fixture.activeProfile()), properties))
                .doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> policy.requireSafe(Set.of(fixture.activeProfile()), properties))
                .isInstanceOf(IllegalStateException.class);
        }
    }

    private List<SafetyFixture> readFixtures() throws IOException {
        InputStream input = getClass().getResourceAsStream("/evals/environment-safety.jsonl");
        if (input == null) {
            throw new IllegalStateException("Missing eval fixture: /evals/environment-safety.jsonl");
        }

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(input, StandardCharsets.UTF_8)
        )) {
            return reader.lines()
                .filter(line -> !line.isBlank())
                .map(this::parseFixture)
                .toList();
        }
    }

    private SafetyFixture parseFixture(String line) {
        try {
            return objectMapper.readValue(line, SafetyFixture.class);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Invalid JSONL eval fixture: " + line, exception);
        }
    }

    record SafetyFixture(
        String id,
        String activeProfile,
        String mode,
        String naverBaseUrl,
        String llmBaseUrl,
        boolean accepted
    ) {
    }
}

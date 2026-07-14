package com.placepick.infrastructure.external.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class EliceLlmContractClientSecurityTest {

    private static final URI CHAT_BASE = URI.create(
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/v1"
    );
    private static final URI EMBEDDING_BASE = URI.create(
        "https://mlapi.run/22222222-2222-4222-8222-222222222222/v1"
    );
    private static final String SYNTHETIC_TOKEN = "synthetic-contract-token";

    @Test
    void acceptsOnlyTheApprovedOfficialShapeAndExactModelPins() {
        assertThatCode(() -> create(CHAT_BASE, EMBEDDING_BASE, SYNTHETIC_TOKEN))
            .doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "[{index}] rejects invalid base URL shape")
    @ValueSource(strings = {
        "http://mlapi.run/11111111-1111-4111-8111-111111111111/v1",
        "https://example.invalid/11111111-1111-4111-8111-111111111111/v1",
        "https://mlapi.run:8443/11111111-1111-4111-8111-111111111111/v1",
        "https://user@mlapi.run/11111111-1111-4111-8111-111111111111/v1",
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/v1/",
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/v1?query=x",
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/v1#fragment",
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/v1/extra",
        "https://mlapi.run/not-a-uuid/v1",
        "https://mlapi.run/11111111-1111-4111-8111-111111111111/responses"
    })
    void rejectsUnapprovedOriginsAndEndpointShapes(String candidate) {
        assertThatThrownBy(() -> create(URI.create(candidate), EMBEDDING_BASE, SYNTHETIC_TOKEN))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("LLM proxy base URL is not an approved origin.")
            .hasMessageNotContaining(candidate)
            .hasMessageNotContaining(SYNTHETIC_TOKEN);
    }

    @Test
    void rejectsOneDeploymentUrlBeingReusedForBothCapabilities() {
        assertThatThrownBy(() -> create(CHAT_BASE, CHAT_BASE, SYNTHETIC_TOKEN))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Chat and embedding proxy URLs must be distinct.")
            .hasMessageNotContaining(CHAT_BASE.toString())
            .hasMessageNotContaining(SYNTHETIC_TOKEN);
    }

    @ParameterizedTest(name = "[{index}] rejects unsafe credential shape")
    @ValueSource(strings = {"", " ", "token with spaces", "token\twith-control"})
    void rejectsMissingWhitespaceOrControlBearingCredentialsWithoutEchoingThem(String token) {
        assertThatThrownBy(() -> create(CHAT_BASE, EMBEDDING_BASE, token))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("LLM proxy credential is missing or invalid.")
            .satisfies(exception -> {
                if (!token.strip().isEmpty()) {
                    assertThat(exception.getMessage()).doesNotContain(token.strip());
                }
            });
    }

    @Test
    void rejectsModelDrift() {
        assertThatThrownBy(() -> EliceLlmContractClient.create(
            CHAT_BASE,
            EMBEDDING_BASE,
            SYNTHETIC_TOKEN,
            "openai/another-model",
            EliceLlmContractClient.EMBEDDING_MODEL
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("LLM contract models must match the approved pins.")
            .hasMessageNotContaining(SYNTHETIC_TOKEN);
    }

    @Test
    void testFactoryIsRestrictedToDistinctLoopbackV1UrlsAndBoundedConfiguration() {
        assertThatCode(() -> EliceLlmContractClient.createForTesting(
            URI.create("http://127.0.0.1:18090/chat/v1"),
            URI.create("http://127.0.0.1:18090/embedding/v1"),
            SYNTHETIC_TOKEN,
            EliceLlmContractClient.CHAT_MODEL,
            EliceLlmContractClient.EMBEDDING_MODEL,
            Duration.ofSeconds(1),
            Duration.ofSeconds(1),
            1024
        )).doesNotThrowAnyException();

        assertThatThrownBy(() -> EliceLlmContractClient.createForTesting(
            URI.create("https://example.invalid/chat/v1"),
            URI.create("http://127.0.0.1:18090/embedding/v1"),
            SYNTHETIC_TOKEN,
            EliceLlmContractClient.CHAT_MODEL,
            EliceLlmContractClient.EMBEDDING_MODEL,
            Duration.ofSeconds(1),
            Duration.ofSeconds(1),
            1024
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageNotContaining("example.invalid")
            .hasMessageNotContaining(SYNTHETIC_TOKEN);
    }

    private static EliceLlmContractClient create(URI chat, URI embedding, String token) {
        return EliceLlmContractClient.create(
            chat,
            embedding,
            token,
            EliceLlmContractClient.CHAT_MODEL,
            EliceLlmContractClient.EMBEDDING_MODEL
        );
    }
}

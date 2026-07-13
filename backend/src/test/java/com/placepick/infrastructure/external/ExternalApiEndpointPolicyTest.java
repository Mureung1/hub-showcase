package com.placepick.infrastructure.external;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ExternalApiEndpointPolicyTest {

    private final ExternalApiEndpointPolicy policy = new ExternalApiEndpointPolicy();

    @Test
    void acceptsLoopbackAndComposeMocksForGuardedProfiles() {
        ExternalApiProperties properties = properties(
            "mock",
            "http://localhost:8089",
            "http://mock-llm:8080"
        );

        assertThatCode(() -> policy.requireSafe(Set.of("local"), properties))
            .doesNotThrowAnyException();
    }

    @Test
    void rejectsNonMockModeForGuardedProfiles() {
        ExternalApiProperties properties = properties(
            "real",
            "http://localhost:8089",
            "http://localhost:8090"
        );

        assertThatThrownBy(() -> policy.requireSafe(Set.of("load"), properties))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("PLACEPICK_EXTERNAL_MODE=mock");
    }

    @Test
    void rejectsRealExternalHostsEvenWhenModeSaysMock() {
        ExternalApiProperties properties = properties(
            "mock",
            "https://openapi.naver.com",
            "https://api.openai.com"
        );

        assertThatThrownBy(() -> policy.requireSafe(Set.of("test"), properties))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("approved local mock host");
    }

    @Test
    void doesNotApplyDevelopmentGuardToAnUnrelatedProfile() {
        ExternalApiProperties properties = properties(
            "real",
            "https://openapi.naver.com",
            "https://api.openai.com"
        );

        assertThatCode(() -> policy.requireSafe(Set.of("production"), properties))
            .doesNotThrowAnyException();
    }

    private ExternalApiProperties properties(String mode, String naverUrl, String llmUrl) {
        return new ExternalApiProperties(mode, URI.create(naverUrl), URI.create(llmUrl));
    }
}

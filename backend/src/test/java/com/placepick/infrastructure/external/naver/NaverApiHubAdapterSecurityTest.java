package com.placepick.infrastructure.external.naver;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class NaverApiHubAdapterSecurityTest {

    @Test
    void rejectsAnUnapprovedRuntimeHostBeforeCredentialsCanBeSent() {
        assertThatThrownBy(() -> NaverApiHubAdapter.create(
            URI.create("https://attacker.invalid"),
            "synthetic-key-id",
            "synthetic-secret-key",
            Duration.ofSeconds(1),
            Duration.ofSeconds(1)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("approved official origin")
            .hasMessageNotContaining("synthetic-key-id")
            .hasMessageNotContaining("synthetic-secret-key");
    }
}

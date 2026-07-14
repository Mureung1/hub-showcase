package com.placepick.infrastructure.external.naver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class NaverWireMockMappingsIntegrationTest {

    private static WireMockServer wireMock;

    @BeforeAll
    static void startCommittedMappings() {
        Path mappingsRoot = locateMappingsRoot();
        wireMock = new WireMockServer(
            WireMockConfiguration.options()
                .dynamicPort()
                .usingFilesUnderDirectory(mappingsRoot.toString())
        );
        wireMock.start();
    }

    @AfterAll
    static void stopCommittedMappings() {
        if (wireMock != null) {
            wireMock.stop();
        }
    }

    @Test
    void loadsCommittedCurrentMappingsAndRejectsBothLegacyPaths() throws Exception {
        assertThat(status("/search/v1/local?query=contract&display=1", true)).isEqualTo(200);
        assertThat(status("/search/v1/blog?query=contract&display=1", true)).isEqualTo(200);
        assertThat(status("/v1/search/local.json", false)).isEqualTo(410);
        assertThat(status("/v1/search/blog.json", false)).isEqualTo(410);
    }

    @Test
    void exercisesEveryCommittedErrorEmptyMalformedAndTimeoutMapping() throws Exception {
        for (String endpoint : new String[] {"local", "blog"}) {
            String prefix = "/search/v1/" + endpoint + "?display=1&query=";
            assertThat(status(prefix + "force-invalid-request", true)).isEqualTo(400);
            assertThat(status(prefix + "force-auth-error", true)).isEqualTo(401);
            assertThat(status(prefix + "force-forbidden", true)).isEqualTo(403);
            assertThat(status(prefix + "force-rate-limit", true)).isEqualTo(429);
            assertThat(status(prefix + "force-error", true)).isEqualTo(503);
            assertThat(status(prefix + "force-empty", true)).isEqualTo(200);

            HttpResponse<String> malformed = response(
                prefix + "force-malformed",
                true,
                Duration.ofSeconds(2)
            );
            assertThat(malformed.statusCode()).isEqualTo(200);
            assertThat(malformed.body()).isEqualTo("{not-json");

            assertThatThrownBy(() -> response(
                prefix + "force-timeout",
                true,
                Duration.ofMillis(250)
            )).isInstanceOf(HttpTimeoutException.class);
        }
    }

    private static int status(String path, boolean authenticated)
        throws IOException, InterruptedException {
        return response(path, authenticated, Duration.ofSeconds(2)).statusCode();
    }

    private static HttpResponse<String> response(
        String path,
        boolean authenticated,
        Duration timeout
    ) throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(wireMock.baseUrl() + path))
            .timeout(timeout)
            .GET();
        if (authenticated) {
            request.header(NaverApiHubAdapter.KEY_ID_HEADER, "synthetic-key-id");
            request.header(NaverApiHubAdapter.KEY_HEADER, "synthetic-secret-key");
        }
        return HttpClient.newHttpClient()
            .send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static Path locateMappingsRoot() {
        Path workingDirectory = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        Path fromRoot = workingDirectory.resolve("mock-api/naver").normalize();
        Path fromBackend = workingDirectory.resolve("../mock-api/naver").normalize();
        Path selected = Files.isDirectory(fromRoot) ? fromRoot : fromBackend;
        if (!Files.isDirectory(selected.resolve("mappings"))) {
            throw new IllegalStateException("Committed Naver WireMock mappings are missing.");
        }
        return selected;
    }
}

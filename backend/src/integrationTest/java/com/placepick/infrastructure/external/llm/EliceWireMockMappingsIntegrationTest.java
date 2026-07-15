package com.placepick.infrastructure.external.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class EliceWireMockMappingsIntegrationTest {

    private static final String CHAT_PATH = "/v1/chat/completions";
    private static final String EMBEDDING_PATH = "/v1/embeddings";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
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
    void servesStrictChatAndDefault1536DimensionEmbeddingFixtures() throws Exception {
        HttpResponse<String> chat = response(
            CHAT_PATH,
            validChatRequest(),
            Duration.ofSeconds(2)
        );
        HttpResponse<String> embedding = response(
            EMBEDDING_PATH,
            validEmbeddingRequest(),
            Duration.ofSeconds(2)
        );

        assertThat(chat.statusCode()).isEqualTo(200);
        JsonNode chatJson = OBJECT_MAPPER.readTree(chat.body());
        assertThat(chatJson.path("object").asText()).isEqualTo("chat.completion");
        assertThat(OBJECT_MAPPER.readTree(
            chatJson.path("choices").get(0).path("message").path("content").asText()
        ).path("status").asText()).isEqualTo("ok");

        assertThat(embedding.statusCode()).isEqualTo(200);
        JsonNode embeddingJson = OBJECT_MAPPER.readTree(embedding.body());
        assertThat(embeddingJson.path("object").asText()).isEqualTo("list");
        assertThat(embeddingJson.path("data")).hasSize(1);
        assertThat(embeddingJson.path("data").get(0).path("embedding"))
            .hasSize(EliceLlmContractClient.EMBEDDING_DIMENSIONS);
    }

    @Test
    void exercisesEveryCommittedHttpErrorMappingForBothCapabilities() throws Exception {
        for (String path : new String[] {CHAT_PATH, EMBEDDING_PATH}) {
            assertThat(status(path, "force-invalid-request")).isEqualTo(400);
            assertThat(status(path, "force-auth-error")).isEqualTo(401);
            assertThat(status(path, "force-forbidden")).isEqualTo(403);
            assertThat(status(path, "force-rate-limit")).isEqualTo(429);
            assertThat(status(path, "force-error")).isEqualTo(503);
        }
    }

    @Test
    void exposesDeterministicMalformedRefusalIncompleteAndInvalidSchemaFixtures()
        throws Exception {
        HttpResponse<String> chatMalformed = response(
            CHAT_PATH,
            markerRequest("force-malformed"),
            Duration.ofSeconds(2)
        );
        HttpResponse<String> embeddingMalformed = response(
            EMBEDDING_PATH,
            markerRequest("force-malformed"),
            Duration.ofSeconds(2)
        );
        assertThat(chatMalformed.body()).isEqualTo("{not-json");
        assertThat(embeddingMalformed.body()).isEqualTo("{not-json");

        JsonNode refusal = json(CHAT_PATH, "force-refusal");
        assertThat(refusal.path("choices").get(0).path("message").path("refusal").asText())
            .isNotBlank();
        JsonNode incomplete = json(CHAT_PATH, "force-incomplete");
        assertThat(incomplete.path("choices").get(0).path("finish_reason").asText())
            .isEqualTo("length");
        JsonNode invalidEmbedding = json(EMBEDDING_PATH, "force-invalid-schema");
        assertThat(invalidEmbedding.path("data").get(0).path("embedding")).hasSize(2);
    }

    @Test
    void suppliesTimeoutFixturesAndExplicitlyRejectsResponsesApi() throws Exception {
        for (String path : new String[] {CHAT_PATH, EMBEDDING_PATH}) {
            assertThatThrownBy(() -> response(
                path,
                markerRequest("force-timeout"),
                Duration.ofMillis(250)
            )).isInstanceOf(HttpTimeoutException.class);
        }

        assertThat(response(
            "/v1/responses",
            "{\"model\":\"openai/gpt-4.1-mini\"}",
            Duration.ofSeconds(2)
        ).statusCode()).isEqualTo(410);
    }

    private static JsonNode json(String path, String marker) throws Exception {
        HttpResponse<String> response = response(
            path,
            markerRequest(marker),
            Duration.ofSeconds(2)
        );
        assertThat(response.statusCode()).isEqualTo(200);
        return OBJECT_MAPPER.readTree(response.body());
    }

    private static int status(String path, String marker) throws Exception {
        return response(path, markerRequest(marker), Duration.ofSeconds(2)).statusCode();
    }

    private static HttpResponse<String> response(
        String path,
        String body,
        Duration timeout
    ) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(wireMock.baseUrl() + path))
            .timeout(timeout)
            .header("Authorization", "Bearer synthetic-mapping-token")
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        return HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build()
            .send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static String markerRequest(String marker) {
        return "{\"input\":\"" + marker + "\"}";
    }

    private static String validChatRequest() {
        return """
            {
              "model":"openai/gpt-4.1-mini",
              "messages":[{"role":"user","content":"synthetic"}],
              "stream":false,
              "store":false,
              "temperature":0,
              "max_completion_tokens":32,
              "response_format":{"type":"json_schema","json_schema":{"strict":true}}
            }
            """;
    }

    private static String validEmbeddingRequest() {
        return """
            {
              "model":"openai/text-embedding-3-small",
              "input":"synthetic",
              "encoding_format":"float"
            }
            """;
    }

    private static Path locateMappingsRoot() {
        Path workingDirectory = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        Path fromRoot = workingDirectory.resolve("mock-api/llm").normalize();
        Path fromBackend = workingDirectory.resolve("../mock-api/llm").normalize();
        Path selected = Files.isDirectory(fromRoot) ? fromRoot : fromBackend;
        if (!Files.isDirectory(selected.resolve("mappings"))) {
            throw new IllegalStateException("Committed Elice WireMock mappings are missing.");
        }
        return selected;
    }
}

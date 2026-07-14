package com.placepick.infrastructure.external.llm;

import java.net.URI;
import java.time.Duration;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class EliceLlmLiveContractTest {

    private static final long MINIMUM_CALL_INTERVAL_MILLISECONDS = 1_000L;

    @Test
    void verifiesChatAndEmbeddingSchemasWithOneApplicationCallEach() {
        requireExplicitEnablement();
        EliceLlmContractClient client = EliceLlmContractClient.create(
            requiredBaseUrl("CHAT_PROXY_URL"),
            requiredBaseUrl("EMBEDDING_PROXY_URL"),
            requiredEnvironment("PROXY_TOKEN"),
            requiredEnvironment("OPENAI_MODEL"),
            requiredEnvironment("OPENAI_EMBEDDING_MODEL")
        );

        CallOutcome<EliceLlmContractClient.ChatContractResult> chat = attempt(
            client::verifyChatContract
        );
        waitForEmbeddingCallInterval();
        CallOutcome<EliceLlmContractClient.EmbeddingContractResult> embedding = attempt(
            client::verifyEmbeddingContract
        );

        printChatOutcome(chat);
        printEmbeddingOutcome(embedding);
        boolean passed = chat.succeeded() && embedding.succeeded();
        System.out.println("LLM_LIVE status=" + (passed ? "passed" : "failed") + " callCount=2");
        if (!passed) {
            throw new AssertionError(
                "LLM live contract failed after two calls: chat=" + chat.category() +
                ", embedding=" + embedding.category()
            );
        }
    }

    private static void requireExplicitEnablement() {
        if (!"live-contract".equals(System.getenv("PLACEPICK_EXTERNAL_MODE"))) {
            throw new IllegalStateException(
                "Live contract test requires PLACEPICK_EXTERNAL_MODE=live-contract."
            );
        }
        if (System.getenv("CI") != null) {
            throw new IllegalStateException("Live contract test is forbidden when CI is set.");
        }
    }

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                name + " is required for the approved LLM live contract test."
            );
        }
        return value;
    }

    private static URI requiredBaseUrl(String name) {
        String value = requiredEnvironment(name);
        try {
            return URI.create(value);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(name + " is invalid.", null);
        }
    }

    private static <T> CallOutcome<T> attempt(Supplier<T> operation) {
        long startedAt = System.nanoTime();
        try {
            return new CallOutcome<>(operation.get(), null, null, elapsedMilliseconds(startedAt));
        } catch (LlmProviderException exception) {
            return new CallOutcome<>(
                null,
                exception.failure().name(),
                exception.httpStatus(),
                elapsedMilliseconds(startedAt)
            );
        } catch (RuntimeException exception) {
            return new CallOutcome<>(
                null,
                LlmProviderFailure.INVALID_RESPONSE.name(),
                null,
                elapsedMilliseconds(startedAt)
            );
        }
    }

    private static void printChatOutcome(
        CallOutcome<EliceLlmContractClient.ChatContractResult> outcome
    ) {
        String http = safeHttp(outcome);
        if (outcome.succeeded()) {
            var result = outcome.value();
            System.out.println(
                "LLM_LIVE endpoint=chat http=2xx schema=true inputTokens=" +
                result.inputTokens() + " outputTokens=" + result.outputTokens() +
                " latencyMs=" + result.latencyMilliseconds()
            );
        } else {
            System.out.println(
                "LLM_LIVE endpoint=chat http=" + http +
                " schema=false inputTokens=none outputTokens=none latencyMs=" +
                outcome.latencyMilliseconds()
            );
        }
    }

    private static void printEmbeddingOutcome(
        CallOutcome<EliceLlmContractClient.EmbeddingContractResult> outcome
    ) {
        String http = safeHttp(outcome);
        if (outcome.succeeded()) {
            var result = outcome.value();
            System.out.println(
                "LLM_LIVE endpoint=embedding http=2xx schema=true itemCount=" +
                result.itemCount() + " dimensions=" + result.dimensions() +
                " inputTokens=" + result.inputTokens() + " latencyMs=" +
                result.latencyMilliseconds()
            );
        } else {
            System.out.println(
                "LLM_LIVE endpoint=embedding http=" + http +
                " schema=false itemCount=none dimensions=none inputTokens=none latencyMs=" +
                outcome.latencyMilliseconds()
            );
        }
    }

    private static String safeHttp(CallOutcome<?> outcome) {
        return outcome.httpStatus() == null ? "none" : Integer.toString(outcome.httpStatus());
    }

    private static void waitForEmbeddingCallInterval() {
        try {
            Thread.sleep(MINIMUM_CALL_INTERVAL_MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Live contract call interval was interrupted.");
        }
    }

    private static long elapsedMilliseconds(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }

    private record CallOutcome<T>(
        T value,
        String category,
        Integer httpStatus,
        long latencyMilliseconds
    ) {
        boolean succeeded() {
            return value != null && category == null;
        }
    }
}

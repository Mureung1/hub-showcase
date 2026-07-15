package com.placepick.infrastructure.external.naver;

import com.placepick.recommendation.application.port.out.BlogSearchQuery;
import com.placepick.recommendation.application.port.out.PlaceSearchQuery;
import com.placepick.recommendation.application.port.out.SearchProviderException;
import com.placepick.recommendation.application.port.out.SearchProviderFailure;
import com.placepick.recommendation.application.port.out.SearchProviderFailureStage;
import java.net.URI;
import java.time.Duration;
import java.util.function.Supplier;
import java.util.function.ToIntFunction;
import org.junit.jupiter.api.Test;

class NaverApiHubLiveContractTest {

    private static final URI OFFICIAL_BASE_URL = URI.create(
        "https://naverapihub.apigw.ntruss.com"
    );
    private static final String FIXED_NON_PERSONAL_QUERY = "서울 카페";
    private static final long MINIMUM_CALL_INTERVAL_MILLISECONDS = 1_000L;

    @Test
    void verifiesCurrentLocalAndBlogSchemaWithinTwoCalls() {
        requireExplicitEnablement();
        String keyId = requiredEnvironment("NAVER_API_HUB_KEY_ID");
        String key = requiredEnvironment("NAVER_API_HUB_KEY");
        NaverApiHubAdapter localAdapter = NaverApiHubAdapter.create(
            OFFICIAL_BASE_URL,
            keyId,
            key,
            Duration.ofSeconds(2),
            Duration.ofSeconds(5)
        );
        NaverApiHubAdapter blogAdapter = NaverApiHubAdapter.create(
            OFFICIAL_BASE_URL,
            keyId,
            key,
            Duration.ofSeconds(2),
            Duration.ofSeconds(5)
        );

        var local = attempt(() -> localAdapter.searchPlaces(
            new PlaceSearchQuery(FIXED_NON_PERSONAL_QUERY, 1)
        ));
        waitForBlogCallInterval();
        var blog = attempt(() -> blogAdapter.searchBlogs(
            new BlogSearchQuery(FIXED_NON_PERSONAL_QUERY, 1)
        ));

        printOutcome("local", local, result -> result.items().size());
        printOutcome("blog", blog, result -> result.items().size());
        boolean passed = local.succeeded() && blog.succeeded();
        System.out.println(
            "NAVER_LIVE status=" + (passed ? "passed" : "failed") +
            " logicalCallCount=2"
        );
        if (!passed) {
            throw new AssertionError(
                "NAVER live contract failed after two application calls: local=" +
                local.category() + "/" + local.stage() + ", blog=" + blog.category() +
                "/" + blog.stage()
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
            throw new IllegalStateException(name + " is required for the approved live contract test.");
        }
        return value;
    }

    private static <T> CallOutcome<T> attempt(Supplier<T> operation) {
        long startedAt = System.nanoTime();
        try {
            return new CallOutcome<>(
                operation.get(),
                null,
                null,
                null,
                elapsedMilliseconds(startedAt)
            );
        } catch (SearchProviderException exception) {
            return new CallOutcome<>(
                null,
                exception.failure().name(),
                exception.httpStatus(),
                exception.stage().name(),
                elapsedMilliseconds(startedAt)
            );
        } catch (RuntimeException exception) {
            return new CallOutcome<>(
                null,
                SearchProviderFailure.INVALID_RESPONSE.name(),
                null,
                SearchProviderFailureStage.UNEXPECTED.name(),
                elapsedMilliseconds(startedAt)
            );
        }
    }

    private static <T> void printOutcome(
        String endpoint,
        CallOutcome<T> outcome,
        ToIntFunction<T> itemCounter
    ) {
        String status = outcome.succeeded()
            ? "2xx"
            : outcome.httpStatus() == null ? "none" : Integer.toString(outcome.httpStatus());
        String itemCount = outcome.succeeded()
            ? Integer.toString(itemCounter.applyAsInt(outcome.value()))
            : "none";
        System.out.println(
            "NAVER_LIVE endpoint=" + endpoint + " http=" + status +
            " schema=" + outcome.succeeded() + " itemCount=" + itemCount +
            (outcome.succeeded() ? "" : " reason=" + outcome.stage()) +
            " latencyMs=" + outcome.latencyMilliseconds()
        );
    }

    private static void waitForBlogCallInterval() {
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
        String stage,
        long latencyMilliseconds
    ) {
        boolean succeeded() {
            return value != null && category == null;
        }
    }
}

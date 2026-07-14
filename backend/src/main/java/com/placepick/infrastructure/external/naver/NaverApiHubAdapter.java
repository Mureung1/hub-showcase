package com.placepick.infrastructure.external.naver;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.placepick.recommendation.application.port.out.BlogSearchItem;
import com.placepick.recommendation.application.port.out.BlogSearchPort;
import com.placepick.recommendation.application.port.out.BlogSearchQuery;
import com.placepick.recommendation.application.port.out.BlogSearchResult;
import com.placepick.recommendation.application.port.out.PlaceSearchItem;
import com.placepick.recommendation.application.port.out.PlaceSearchPort;
import com.placepick.recommendation.application.port.out.PlaceSearchQuery;
import com.placepick.recommendation.application.port.out.PlaceSearchResult;
import com.placepick.recommendation.application.port.out.SearchProviderException;
import com.placepick.recommendation.application.port.out.SearchProviderFailure;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

public final class NaverApiHubAdapter implements PlaceSearchPort, BlogSearchPort {

    private static final URI OFFICIAL_BASE_URL = URI.create(
        "https://naverapihub.apigw.ntruss.com"
    );
    static final String LOCAL_PATH = "/search/v1/local";
    static final String BLOG_PATH = "/search/v1/blog";
    static final String KEY_ID_HEADER = "X-NCP-APIGW-API-KEY-ID";
    static final String KEY_HEADER = "X-NCP-APIGW-API-KEY";

    private final RestClient restClient;

    NaverApiHubAdapter(RestClient restClient) {
        this.restClient = Objects.requireNonNull(restClient, "restClient");
    }

    public static NaverApiHubAdapter create(
        URI baseUrl,
        String keyId,
        String key,
        Duration connectTimeout,
        Duration readTimeout
    ) {
        requireOfficialBaseUrl(baseUrl);
        return createWithValidatedBaseUrl(baseUrl, keyId, key, connectTimeout, readTimeout);
    }

    static NaverApiHubAdapter createForTesting(
        URI baseUrl,
        String keyId,
        String key,
        Duration connectTimeout,
        Duration readTimeout
    ) {
        requireSafeBaseUrl(baseUrl);
        return createWithValidatedBaseUrl(baseUrl, keyId, key, connectTimeout, readTimeout);
    }

    private static NaverApiHubAdapter createWithValidatedBaseUrl(
        URI baseUrl,
        String keyId,
        String key,
        Duration connectTimeout,
        Duration readTimeout
    ) {
        requireCredential("NAVER API HUB key ID", keyId);
        requireCredential("NAVER API HUB key", key);
        requirePositiveTimeout("connect timeout", connectTimeout);
        requirePositiveTimeout("read timeout", readTimeout);

        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(connectTimeout)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(readTimeout);

        RestClient client = RestClient.builder()
            .baseUrl(baseUrl.toString())
            .requestFactory(requestFactory)
            .defaultHeader(KEY_ID_HEADER, keyId)
            .defaultHeader(KEY_HEADER, key)
            .build();
        return new NaverApiHubAdapter(client);
    }

    @Override
    public PlaceSearchResult searchPlaces(PlaceSearchQuery query) {
        Objects.requireNonNull(query, "query");
        NaverLocalResponse response = execute(() -> restClient.get()
            .uri(uriBuilder -> uriBuilder
                .path(LOCAL_PATH)
                .queryParam("query", query.query())
                .queryParam("display", query.limit())
                .build())
            .retrieve()
            .onStatus(HttpStatusCode::isError, NaverApiHubAdapter::raiseProviderError)
            .body(NaverLocalResponse.class));

        validateLocalResponse(response, query.limit());
        List<PlaceSearchItem> items = response.items().stream()
            .map(NaverApiHubAdapter::toPlaceItem)
            .toList();
        return new PlaceSearchResult(response.total(), items);
    }

    @Override
    public BlogSearchResult searchBlogs(BlogSearchQuery query) {
        Objects.requireNonNull(query, "query");
        NaverBlogResponse response = execute(() -> restClient.get()
            .uri(uriBuilder -> uriBuilder
                .path(BLOG_PATH)
                .queryParam("query", query.query())
                .queryParam("display", query.limit())
                .build())
            .retrieve()
            .onStatus(HttpStatusCode::isError, NaverApiHubAdapter::raiseProviderError)
            .body(NaverBlogResponse.class));

        validateBlogResponse(response, query.limit());
        List<BlogSearchItem> items = response.items().stream()
            .map(NaverApiHubAdapter::toBlogItem)
            .toList();
        return new BlogSearchResult(response.total(), items);
    }

    private static <T> T execute(RequestOperation<T> operation) {
        try {
            return operation.execute();
        } catch (SearchProviderException exception) {
            throw exception;
        } catch (ResourceAccessException exception) {
            throw new SearchProviderException(
                SearchProviderFailure.PROVIDER_UNAVAILABLE,
                null,
                "NAVER API HUB request could not be completed.",
                null
            );
        } catch (RestClientException exception) {
            throw new SearchProviderException(
                SearchProviderFailure.INVALID_RESPONSE,
                null,
                "NAVER API HUB returned an unreadable response.",
                null
            );
        }
    }

    private static void raiseProviderError(
        org.springframework.http.HttpRequest request,
        org.springframework.http.client.ClientHttpResponse response
    ) throws IOException {
        int status = response.getStatusCode().value();
        SearchProviderFailure failure = switch (status) {
            case HttpURLConnection.HTTP_BAD_REQUEST -> SearchProviderFailure.INVALID_REQUEST;
            case HttpURLConnection.HTTP_UNAUTHORIZED,
                 HttpURLConnection.HTTP_FORBIDDEN -> SearchProviderFailure.AUTHENTICATION_FAILED;
            case 429 -> SearchProviderFailure.RATE_LIMITED;
            default -> status >= 500
                ? SearchProviderFailure.PROVIDER_UNAVAILABLE
                : SearchProviderFailure.INVALID_REQUEST;
        };
        throw new SearchProviderException(
            failure,
            status,
            "NAVER API HUB request failed with HTTP " + status + ".",
            null
        );
    }

    private static PlaceSearchItem toPlaceItem(NaverLocalItem item) {
        if (item == null || item.title() == null || item.title().isBlank()) {
            throw invalidResponse("NAVER API HUB local item is missing a title.");
        }
        return new PlaceSearchItem(
            NaverTextSanitizer.plainText(item.title()),
            text(item.link()),
            NaverTextSanitizer.plainText(item.category()),
            NaverTextSanitizer.plainText(item.description()),
            NaverTextSanitizer.plainText(item.address()),
            NaverTextSanitizer.plainText(item.roadAddress()),
            text(item.mapx()),
            text(item.mapy())
        );
    }

    private static BlogSearchItem toBlogItem(NaverBlogItem item) {
        if (item == null || item.title() == null || item.title().isBlank()) {
            throw invalidResponse("NAVER API HUB blog item is missing a title.");
        }
        return new BlogSearchItem(
            NaverTextSanitizer.plainText(item.title()),
            text(item.link()),
            NaverTextSanitizer.plainText(item.description()),
            NaverTextSanitizer.plainText(item.bloggername()),
            text(item.bloggerlink()),
            text(item.postdate())
        );
    }

    private static void validateLocalResponse(NaverLocalResponse response, int requestedLimit) {
        if (response == null || !validEnvelope(
            response.lastBuildDate(),
            response.total(),
            response.start(),
            response.display(),
            response.items(),
            requestedLimit
        ) || response.items().stream().anyMatch(item -> !validLocalItem(item))) {
            throw invalidResponse("NAVER API HUB local response schema is invalid.");
        }
    }

    private static void validateBlogResponse(NaverBlogResponse response, int requestedLimit) {
        if (response == null || !validEnvelope(
            response.lastBuildDate(),
            response.total(),
            response.start(),
            response.display(),
            response.items(),
            requestedLimit
        ) || response.items().stream().anyMatch(item -> !validBlogItem(item))) {
            throw invalidResponse("NAVER API HUB blog response schema is invalid.");
        }
    }

    private static boolean validEnvelope(
        String lastBuildDate,
        Integer total,
        Integer start,
        Integer display,
        List<?> items,
        int requestedLimit
    ) {
        return lastBuildDate != null && !lastBuildDate.isBlank() &&
            total != null && total >= 0 &&
            start != null && start >= 1 &&
            display != null && display >= 0 && display <= requestedLimit &&
            items != null && items.size() <= requestedLimit;
    }

    private static boolean validLocalItem(NaverLocalItem item) {
        return item != null && item.title() != null && !item.title().isBlank() &&
            item.link() != null && item.category() != null && item.description() != null &&
            item.address() != null && item.roadAddress() != null &&
            item.mapx() != null && item.mapy() != null;
    }

    private static boolean validBlogItem(NaverBlogItem item) {
        return item != null && item.title() != null && !item.title().isBlank() &&
            item.link() != null && item.description() != null &&
            item.bloggername() != null && item.bloggerlink() != null &&
            item.postdate() != null;
    }

    private static SearchProviderException invalidResponse(String message) {
        return new SearchProviderException(
            SearchProviderFailure.INVALID_RESPONSE,
            null,
            message,
            null
        );
    }

    private static String text(String value) {
        return value == null ? "" : value.strip();
    }

    private static void requireSafeBaseUrl(URI baseUrl) {
        Objects.requireNonNull(baseUrl, "baseUrl");
        String scheme = baseUrl.getScheme();
        if (!baseUrl.isAbsolute() || scheme == null ||
            !("http".equals(scheme.toLowerCase(Locale.ROOT)) ||
              "https".equals(scheme.toLowerCase(Locale.ROOT))) ||
            baseUrl.getHost() == null || baseUrl.getUserInfo() != null ||
            (baseUrl.getPath() != null && !baseUrl.getPath().isBlank() && !"/".equals(baseUrl.getPath())) ||
            baseUrl.getQuery() != null || baseUrl.getFragment() != null) {
            throw new IllegalArgumentException("NAVER API HUB base URL is invalid.");
        }
    }

    private static void requireOfficialBaseUrl(URI baseUrl) {
        if (!OFFICIAL_BASE_URL.equals(baseUrl)) {
            throw new IllegalArgumentException(
                "NAVER API HUB runtime base URL must match the approved official origin."
            );
        }
    }

    private static void requireCredential(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required when the NAVER adapter is enabled.");
        }
    }

    private static void requirePositiveTimeout(String name, Duration value) {
        if (value == null || value.isNegative() || value.isZero()) {
            throw new IllegalArgumentException("NAVER API HUB " + name + " must be positive.");
        }
    }

    @FunctionalInterface
    private interface RequestOperation<T> {
        T execute();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NaverLocalResponse(
        String lastBuildDate,
        Integer total,
        Integer start,
        Integer display,
        List<NaverLocalItem> items
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NaverLocalItem(
        String title,
        String link,
        String category,
        String description,
        String telephone,
        String address,
        String roadAddress,
        String mapx,
        String mapy
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NaverBlogResponse(
        String lastBuildDate,
        Integer total,
        Integer start,
        Integer display,
        List<NaverBlogItem> items
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NaverBlogItem(
        String title,
        String link,
        String description,
        String bloggername,
        String bloggerlink,
        String postdate
    ) {
    }
}

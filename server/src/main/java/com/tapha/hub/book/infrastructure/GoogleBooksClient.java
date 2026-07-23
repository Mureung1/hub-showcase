package com.tapha.hub.book.infrastructure;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tapha.hub.book.application.BookMetadata;
import com.tapha.hub.book.application.BookMetadataClient;
import com.tapha.hub.book.application.BookProviderException;

@Component
public class GoogleBooksClient implements BookMetadataClient {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String baseUrl;
    private final String apiKey;

    public GoogleBooksClient(
            @Value("${app.books.google-books.base-url:https://www.googleapis.com/books/v1}") String baseUrl,
            @Value("${app.books.google-books.api-key:}") String apiKey
    ) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey;
    }

    @Override
    public List<BookMetadata> search(String query) {
        JsonNode root = getJson("/volumes?q=" + encode(query) + "&printType=books&maxResults=10&projection=lite");
        List<BookMetadata> books = new ArrayList<>();
        root.path("items").forEach(item -> books.add(toMetadata(item)));
        return books.stream()
                .filter(book -> !book.title().isBlank())
                .toList();
    }

    @Override
    public BookMetadata get(String providerId) {
        return toMetadata(getJson("/volumes/" + encode(providerId)));
    }

    private JsonNode getJson(String path) {
        String separator = path.contains("?") ? "&" : "?";
        String key = apiKey.isBlank() ? "" : separator + "key=" + encode(apiKey);
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path + key))
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BookProviderException("도서 정보를 불러오지 못했어요.");
            }
            return objectMapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BookProviderException("도서 정보를 불러오지 못했어요.", exception);
        } catch (IOException exception) {
            throw new BookProviderException("도서 정보를 불러오지 못했어요.", exception);
        }
    }

    private BookMetadata toMetadata(JsonNode item) {
        JsonNode info = item.path("volumeInfo");
        String isbn10 = null;
        String isbn13 = null;
        for (JsonNode identifier : info.path("industryIdentifiers")) {
            switch (identifier.path("type").asText()) {
                case "ISBN_10" -> isbn10 = identifier.path("identifier").asText(null);
                case "ISBN_13" -> isbn13 = identifier.path("identifier").asText(null);
                default -> { }
            }
        }

        return new BookMetadata(
                "GOOGLE_BOOKS",
                item.path("id").asText(),
                info.path("title").asText(""),
                info.path("authors").isArray() && !info.path("authors").isEmpty()
                        ? info.path("authors").get(0).asText()
                        : null,
                isbn10,
                isbn13,
                info.path("publishedDate").asText(null),
                info.path("pageCount").isInt() ? info.path("pageCount").asInt() : null
        );
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

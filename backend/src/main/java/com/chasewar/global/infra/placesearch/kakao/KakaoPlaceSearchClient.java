package com.chasewar.global.infra.placesearch.kakao;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.global.infra.placesearch.kakao.dto.KakaoKeywordResponse;
import com.chasewar.global.infra.placesearch.kakao.dto.KakaoKeywordResponse.Document;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class KakaoPlaceSearchClient implements PlaceSearchClient {

    private static final String BASE_URL = "https://dapi.kakao.com";
    private static final String AUTH_PREFIX = "KakaoAK ";

    private final RestClient restClient;

    public KakaoPlaceSearchClient(@Value("${kakao.api.key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, AUTH_PREFIX + apiKey)
                .build();
    }

    @Override
    public Optional<Coordinates> searchByKeyword(String keyword) {
        KakaoKeywordResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/keyword.json")
                        .queryParam("query", keyword)
                        .build())
                .retrieve()
                .body(KakaoKeywordResponse.class);

        return toCoordinates(response);
    }

    private Optional<Coordinates> toCoordinates(KakaoKeywordResponse response) {
        if (response == null || response.documents().isEmpty()) {
            return Optional.empty();
        }

        Document document = response.documents().get(0);
        double latitude = Double.parseDouble(document.latitude());
        double longitude = Double.parseDouble(document.longitude());

        return Optional.of(new Coordinates(latitude, longitude));
    }
}

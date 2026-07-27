package com.chasewar.place.infra.placesearch.kakao;

import com.chasewar.place.domain.Place;
import com.chasewar.place.infra.placesearch.PlaceSearchClient;
import com.chasewar.place.infra.placesearch.kakao.dto.KakaoKeywordResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class KakaoPlaceSearchClient implements PlaceSearchClient {

    private static final String BASE_URL = "https://dapi.kakao.com";
    private static final String AUTH_PREFIX = "KakaoAK ";
    private static final int RESULT_SIZE = 10;

    private final RestClient restClient;

    public KakaoPlaceSearchClient(@Value("${kakao.api.key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, AUTH_PREFIX + apiKey)
                .build();
    }

    @Override
    public List<Place> searchByKeyword(String keyword) {
        KakaoKeywordResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/keyword.json")
                        .queryParam("query", keyword)
                        .queryParam("size", RESULT_SIZE)
                        .build())
                .retrieve()
                .body(KakaoKeywordResponse.class);

        if (response == null) {
            return List.of();
        }

        return response.toPlaces();
    }
}

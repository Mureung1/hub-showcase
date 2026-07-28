package com.chasewar.place.infra.placesearch.kakao;

import com.chasewar.place.domain.Place;
import com.chasewar.place.infra.placesearch.PlaceSearchClient;
import com.chasewar.place.infra.placesearch.kakao.dto.KakaoKeywordResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class KakaoPlaceSearchClient implements PlaceSearchClient {

    private static final int RESULT_SIZE = 10;

    private final RestClient kakaoRestClient;


    @Retryable(
            retryFor = {
                    ResourceAccessException.class,
                    HttpServerErrorException.class
            },
            maxAttempts = 2,
            backoff = @Backoff(delay = 200)
    )
    @Override
    public List<Place> searchByKeyword(String keyword) {
        KakaoKeywordResponse response = kakaoRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/keyword.json")
                        .queryParam("query", keyword)
                        .queryParam("size", RESULT_SIZE)
                        .build()
                )
                .retrieve()
                .body(KakaoKeywordResponse.class);

        if (response == null) {
            return List.of();
        }

        return response.toPlaces();
    }
}

package com.chasewar.parking.infra.geocoding.kakao;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.infra.geocoding.GeocodingClient;
import com.chasewar.parking.infra.geocoding.kakao.dto.KakaoAddressResponse;
import com.chasewar.parking.infra.geocoding.kakao.dto.KakaoAddressResponse.Document;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class KakaoGeocodingClient implements GeocodingClient {

    private final RestClient kakaoRestClient;

    @Override
    public Optional<Coordinates> geocode(String address) {
        KakaoAddressResponse response = kakaoRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/address.json")
                        .queryParam("query", address)
                        .build()
                )
                .retrieve()
                .body(KakaoAddressResponse.class);

        return toCoordinates(response);
    }

    private Optional<Coordinates> toCoordinates(KakaoAddressResponse response) {
        if (response == null || response.documents().isEmpty()) {
            return Optional.empty();
        }

        Document document = response.documents().get(0);
        double latitude = Double.parseDouble(document.latitude());
        double longitude = Double.parseDouble(document.longitude());

        return Optional.of(new Coordinates(latitude, longitude));
    }
}

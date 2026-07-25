package com.chasewar.place.infra.placesearch.kakao.dto;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.place.domain.Place;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KakaoKeywordResponse(
        @JsonProperty("documents") List<Document> documents
) {

    public List<Place> toPlaces() {
        if (documents == null) {
            return List.of();
        }

        return documents.stream()
                .map(Document::toPlace)
                .toList();
    }

    public record Document(
            @JsonProperty("place_name") String name,
            @JsonProperty("road_address_name") String roadAddress,
            @JsonProperty("address_name") String jibunAddress,
            @JsonProperty("x") String longitude,
            @JsonProperty("y") String latitude
    ) {

        private Place toPlace() {
            return new Place(name, resolveAddress(), toCoordinates());
        }

        private String resolveAddress() {
            if (!isBlank(roadAddress)) {
                return roadAddress;
            }
            if (!isBlank(jibunAddress)) {
                return jibunAddress;
            }
            return null;
        }

        private Coordinates toCoordinates() {
            return new Coordinates(Double.parseDouble(latitude), Double.parseDouble(longitude));
        }

        private static boolean isBlank(String value) {
            return value == null || value.isBlank();
        }
    }
}

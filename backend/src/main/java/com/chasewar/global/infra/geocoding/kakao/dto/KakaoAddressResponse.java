package com.chasewar.global.infra.geocoding.kakao.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KakaoAddressResponse(
        @JsonProperty("documents") List<Document> documents
) {

    public record Document(
            @JsonProperty("x") String longitude,
            @JsonProperty("y") String latitude
    ) {
    }
}

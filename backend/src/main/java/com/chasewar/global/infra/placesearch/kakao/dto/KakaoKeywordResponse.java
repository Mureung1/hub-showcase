package com.chasewar.global.infra.placesearch.kakao.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KakaoKeywordResponse(
        @JsonProperty("documents") List<Document> documents
) {

    public record Document(
            @JsonProperty("x") String longitude,
            @JsonProperty("y") String latitude
    ) {
    }
}

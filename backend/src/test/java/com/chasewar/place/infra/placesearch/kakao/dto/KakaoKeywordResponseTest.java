package com.chasewar.place.infra.placesearch.kakao.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.chasewar.place.domain.Place;
import com.chasewar.place.infra.placesearch.kakao.dto.KakaoKeywordResponse;
import com.chasewar.place.infra.placesearch.kakao.dto.KakaoKeywordResponse.Document;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;

class KakaoKeywordResponseTest {

    @DisplayName("장소의 주소를 매핑")
    @Nested
    class ToPlaceAddress {

        @DisplayName("도로명 주소가 있으면 도로명 주소를 사용한다")
        @Test
        void success_roadAddress() {
            // given
            KakaoKeywordResponse response =
                    responseWithAddress("서울 용산구 이태원로 177", "서울 용산구 이태원동 34-87");

            // when
            Place place = response.toPlaces().get(0);

            // then
            assertThat(place.address()).isEqualTo("서울 용산구 이태원로 177");
        }

        @DisplayName("도로명 주소가 없으면 지번 주소를 사용한다")
        @ParameterizedTest
        @NullAndEmptySource
        void success_fallbackToJibun(String roadAddress) {
            // given
            KakaoKeywordResponse response =
                    responseWithAddress(roadAddress, "서울 용산구 이태원동");

            // when
            Place place = response.toPlaces().get(0);

            // then
            assertThat(place.address()).isEqualTo("서울 용산구 이태원동");
        }
    }

    @DisplayName("장소의 좌표를 매핑")
    @Nested
    class ToPlaceCoordinates {

        @DisplayName("x는 경도로, y는 위도로 매핑한다")
        @Test
        void success_mapCoordinates() {
            // given
            KakaoKeywordResponse response =
                    responseWithCoordinates("126.0", "37.5");

            // when
            Place place = response.toPlaces().get(0);

            // then
            assertThat(place.coordinates().latitude()).isEqualTo(37.5);
            assertThat(place.coordinates().longitude()).isEqualTo(126.0);
        }
    }

    private KakaoKeywordResponse responseWithAddress(String roadAddress, String jibunAddress) {
        return new KakaoKeywordResponse(List.of(
                new Document(
                        "이태원역 6호선",
                        roadAddress,
                        jibunAddress,
                        "126.0",
                        "37.5"
                )
        ));
    }

    private KakaoKeywordResponse responseWithCoordinates(String longitude, String latitude) {
        return new KakaoKeywordResponse(List.of(
                new Document(
                        "이태원역 6호선",
                        "서울 용산구 이태원로 177",
                        "서울 용산구 이태원동 34-87",
                        longitude,
                        latitude
                )
        ));
    }
}
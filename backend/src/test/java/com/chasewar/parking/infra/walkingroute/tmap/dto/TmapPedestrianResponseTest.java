package com.chasewar.parking.infra.walkingroute.tmap.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.chasewar.parking.domain.vo.WalkingRoute;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class TmapPedestrianResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @DisplayName("TMAP 응답을 도보 경로로 매핑")
    @Nested
    class ToWalkingRoute {

        @DisplayName("첫 번째 feature의 총 거리와 총 시간을 WalkingRoute로 변환한다")
        @Test
        void success_mapToWalkingRoute() throws Exception {
            // given
            String json = """
                    {
                      "type": "FeatureCollection",
                      "features": [
                        { "properties": { "totalDistance": 330, "totalTime": 281, "pointType": "SP" } },
                        { "properties": { "distance": 12, "time": 11 } }
                      ]
                    }
                    """;

            // when
            Optional<WalkingRoute> walkingRoute = parse(json).toWalkingRoute();

            // then
            assertThat(walkingRoute).contains(new WalkingRoute(330, 281));
        }

        @DisplayName("총 거리와 총 시간이 없으면 빈 값을 반환한다")
        @Test
        void success_noTotals() throws Exception {
            // given
            String json = """
                    { "features": [ { "properties": { "distance": 12, "time": 11 } } ] }
                    """;
            // 구간 정보만 있고, 총합이 없는 응답

            // when & then
            assertThat(parse(json).toWalkingRoute()).isEmpty();
        }

        @DisplayName("경로를 찾지 못해 features가 빈 값으로 오면 빈 값을 반환한다")
        @Test
        void success_emptyFeatures() throws Exception {
            // when & then
            assertThat(parse("{ \"features\": [] }").toWalkingRoute()).isEmpty();
        }
    }

    private TmapPedestrianResponse parse(String json) throws Exception {
        return objectMapper.readValue(json, TmapPedestrianResponse.class);
    }
}
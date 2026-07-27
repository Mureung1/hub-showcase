package com.chasewar.parking.infra.walkingroute.tmap;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.WalkingRoute;
import com.chasewar.parking.infra.walkingroute.WalkingRouteClient;
import com.chasewar.parking.infra.walkingroute.tmap.dto.TmapPedestrianResponse;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class TmapWalkingRouteClient implements WalkingRouteClient {

    private static final String BASE_URL = "https://apis.openapi.sk.com";
    private static final String APP_KEY_HEADER = "appKey";
    private static final String VERSION = "1";
    private static final String START_NAME = "출발지";
    private static final String END_NAME = "도착지";

    private final RestClient restClient;

    public TmapWalkingRouteClient(@Value("${tmap.api.key}") String appKey) {
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(APP_KEY_HEADER, appKey)
                .build();
    }

    @Override
    public Optional<WalkingRoute> findRoute(Coordinates origin, Coordinates destination) {
        try {
            TmapPedestrianResponse response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/tmap/routes/pedestrian")
                            .queryParam("version", VERSION)
                            .build()
                    )
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toRequestBody(origin, destination))
                    .retrieve()
                    .body(TmapPedestrianResponse.class);

            if (response == null) {
                return Optional.empty();
            }

            return response.toWalkingRoute();
        } catch (RestClientException e) {
            log.warn("[WALKING_ROUTE] TMAP 도보 API 조회 실패, 직선거리로 대체합니다. message={}",
                    e.getMessage());

            return Optional.empty();
        }
    }

    private Map<String, String> toRequestBody(Coordinates origin, Coordinates destination) {
        return Map.of(
                "startX", String.valueOf(origin.longitude()),
                "startY", String.valueOf(origin.latitude()),
                "endX", String.valueOf(destination.longitude()),
                "endY", String.valueOf(destination.latitude()),
                "startName", START_NAME,
                "endName", END_NAME
        );
    }
}

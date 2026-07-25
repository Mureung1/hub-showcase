package com.chasewar.parking.infra.opendata.seoul;

import com.chasewar.parking.infra.opendata.SeoulParkingLotRealtimeClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class SeoulParkingLotRealtimeRestClient implements SeoulParkingLotRealtimeClient {

    private static final String BASE_URL = "http://openapi.seoul.go.kr:8088";
    private static final String SUCCESS_CODE = "INFO-000";

    private final String apiKey;
    private final RestClient restClient;

    public SeoulParkingLotRealtimeRestClient(@Value("${seoul.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .build();
    }

    @Override
    public SeoulParkingLotRealtimeResponse fetchPage(int startIndex, int endIndex) {
        SeoulParkingLotRealtimeResponse response = restClient.get()
                .uri("/{key}/json/GetParkingInfo/{start}/{end}/", apiKey, startIndex, endIndex)
                .retrieve()
                .body(SeoulParkingLotRealtimeResponse.class);
        validate(response);

        return response;
    }

    private void validate(SeoulParkingLotRealtimeResponse response) {
        Result result = response.getParkingInfo().result();
        if (!SUCCESS_CODE.equals(result.code())) {
            log.error("서울시 시영주차장 실시간 OpenAPI(OA-21709) 오류 응답: code={}, message={}",
                    result.code(), result.message());
            throw new SeoulParkingApiException(result.code(), result.message());
        }
    }
}

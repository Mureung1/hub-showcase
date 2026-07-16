package com.chasewar.parking.infra.seoul;

import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotResponse;
import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class SeoulParkingLotRestClient implements SeoulParkingLotClient {

    private static final String BASE_URL = "http://openapi.seoul.go.kr:8088";
    private static final String SUCCESS_CODE = "INFO-000";

    private final RestClient restClient;
    private final String apiKey;

    public SeoulParkingLotRestClient(@Value("${seoul.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .build();
    }

    @Override
    public SeoulParkingLotResponse fetchPage(int startIndex, int endIndex) {

        SeoulParkingLotResponse response = restClient.get()
                .uri("/{key}/json/GetParkInfo/{start}/{end}/", apiKey, startIndex, endIndex)
                .retrieve()
                .body(SeoulParkingLotResponse.class);

        validate(response);
        return response;
    }

    private void validate(SeoulParkingLotResponse response) {
        Result result = response.getParkInfo().result();
        if (!SUCCESS_CODE.equals(result.code())) {
            log.error("서울시 공영주차장 OpenAPI(OA-13122) 오류 응답: code={}, message={}", result.code(), result.message());
            throw new SeoulParkingApiException(result.code(), result.message());
        }
    }
}

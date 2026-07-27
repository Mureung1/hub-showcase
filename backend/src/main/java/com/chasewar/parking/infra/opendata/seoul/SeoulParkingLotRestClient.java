package com.chasewar.parking.infra.opendata.seoul;

import com.chasewar.parking.infra.opendata.SeoulParkingLotClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class SeoulParkingLotRestClient implements SeoulParkingLotClient {

    private static final String SUCCESS_CODE = "INFO-000";

    private final RestClient seoulRestClient;
    private final String apiKey;

    public SeoulParkingLotRestClient(RestClient seoulRestClient, @Value("${seoul.api.key}") String apiKey) {
        this.seoulRestClient = seoulRestClient;
        this.apiKey = apiKey;
    }

    @Override
    public SeoulParkingLotResponse fetchPage(int startIndex, int endIndex) {

        SeoulParkingLotResponse response = seoulRestClient.get()
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

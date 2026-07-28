package com.chasewar.parking.infra.opendata.seoul;

import com.chasewar.parking.infra.opendata.SeoulParkingLotRealtimeClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.UnknownContentTypeException;

@Slf4j
@Component
public class SeoulParkingLotRealtimeRestClient implements SeoulParkingLotRealtimeClient {

    private static final String SUCCESS_CODE = "INFO-000";

    private final RestClient seoulRestClient;
    private final String apiKey;

    public SeoulParkingLotRealtimeRestClient(
            RestClient seoulRestClient,
            @Value("${seoul.api.key}") String apiKey) {
        this.seoulRestClient = seoulRestClient;
        this.apiKey = apiKey;
    }

    // 일시적 실패만 재시도
    // 2026-07-27 05:00에 JSON 대신 XML 에러 페이지를
    // 반환해 한 주기를 통째로 건너뛴 경우가 있어
    // UnknownContentTypeException 을 포함
    @Retryable(
            retryFor = {
                    ResourceAccessException.class,
                    HttpServerErrorException.class,
                    UnknownContentTypeException.class
            },
            maxAttempts = 3,
            backoff = @Backoff(delay = 200, multiplier = 2)
    )
    @Override
    public SeoulParkingLotRealtimeResponse fetchPage(int startIndex, int endIndex) {
        SeoulParkingLotRealtimeResponse response = seoulRestClient.get()
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

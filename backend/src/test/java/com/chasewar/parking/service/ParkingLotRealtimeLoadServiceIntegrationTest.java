package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

import com.chasewar.parking.infra.opendata.SeoulParkingLotRealtimeClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo.Result;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo.Row;
import com.chasewar.parking.repository.ParkingLotRealtimeRepository;
import com.chasewar.support.IntegrationTest;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotRealtimeLoadServiceIntegrationTest extends IntegrationTest {

    @Autowired
    private ParkingLotRealtimeLoadService parkingLotRealtimeLoadService;

    @Autowired
    private ParkingLotRealtimeRepository parkingLotRealtimeRepository;

    @MockitoBean
    private SeoulParkingLotRealtimeClient seoulParkingLotRealtimeClient;

    @DisplayName("실시간 서울 주차장 데이터를 적재한다")
    @Test
    void success_load() {
        // given
        given(seoulParkingLotRealtimeClient.fetchPage(anyInt(), anyInt()))
                .willReturn(responseWith("10001", "10002"));

        // when
        parkingLotRealtimeLoadService.load();

        // then
        assertThat(parkingLotRealtimeRepository.findAll()).hasSize(2);
    }

    @DisplayName("5분 간격의 배치를 다시 적재해도 중복 없이 갱신된다")
    @Test
    void success_reload() {
        // given
        given(seoulParkingLotRealtimeClient.fetchPage(anyInt(), anyInt()))
                .willReturn(responseWith("10001", "10002"));

        // when
        parkingLotRealtimeLoadService.load();
        parkingLotRealtimeLoadService.load();

        // then
        assertThat(parkingLotRealtimeRepository.findAll()).hasSize(2);
    }

    private SeoulParkingLotRealtimeResponse responseWith(String... pkltCds) {
        List<Row> rows = Arrays.stream(pkltCds)
                .map(this::rowWith)
                .toList();
        Result result = new Result("INFO-000", "정상 처리되었습니다");

        return new SeoulParkingLotRealtimeResponse(new GetParkingInfo(pkltCds.length, result, rows));
    }

    private Row rowWith(String pkltCd) {
        return new Row(pkltCd, 100.0, 50.0, "2026-07-22 12:00:00");
    }
}
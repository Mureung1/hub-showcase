package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.chasewar.parking.infra.opendata.SeoulParkingLotClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse.GetParkInfo;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Result;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Row;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotLoadServiceIntegrationTest extends IntegrationTest {

    @Autowired
    private ParkingLotLoadService parkingLotLoadService;

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @MockitoBean
    private SeoulParkingLotClient seoulParkingLotClient;

    @DisplayName("정적 주차장 데이터를 적재")
    @Nested
    class LoadStaticParkingData {

        @DisplayName("정적 주차장 데이터를 애플리케이션에 최초 저장한다")
        @Test
        void success_initialLoad() {
            // given
            given(seoulParkingLotClient.fetchPage(anyInt(), anyInt()))
                    .willReturn(responseWith(2, "1000001", "1000002"));

            // when
            parkingLotLoadService.load();

            // then
            assertThat(parkingLotRepository.findAll()).hasSize(2);
        }

        @DisplayName("같은 데이터를 upsert로 두 번 적재해도 pkltCd 중복 예외 없이 저장된다")
        @Test
        void success_reload() {
            // given
            given(seoulParkingLotClient.fetchPage(anyInt(), anyInt()))
                    .willReturn(responseWith(2, "1000001", "1000002"));

            // when
            parkingLotLoadService.load();
            parkingLotLoadService.load();

            // then
            assertThat(parkingLotRepository.findAll()).hasSize(2);
        }

        @DisplayName("전체 행 수를 페이지 크기만큼 나누어 요청한다")
        @Test
        void success_pagingByPageSize() {
            // given - 서울 공공 API가 전체 2189행이라고 응답
            given(seoulParkingLotClient.fetchPage(anyInt(), anyInt()))
                    .willReturn(responseWith(2189, "1000001", "1000002"));

            // when
            parkingLotLoadService.load();

            // then
            // 첫 페이지 응답을 재사용하므로 페이지당 한 번만 호출
            verify(seoulParkingLotClient).fetchPage(1, 1000);
            verify(seoulParkingLotClient).fetchPage(1001, 2000);
            verify(seoulParkingLotClient).fetchPage(2001, 3000);
            verifyNoMoreInteractions(seoulParkingLotClient);
        }
    }

    private SeoulParkingLotResponse responseWith(int totalCount, String... pkltCds) {
        List<Row> rows = List.of(
                rowWithPkltCd(pkltCds[0]),
                rowWithPkltCd(pkltCds[1])
        );
        Result result = new Result("INFO-000", "정상 처리되었습니다");

        return new SeoulParkingLotResponse(new GetParkInfo(totalCount, result, rows));
    }

    private Row rowWithPkltCd(String pkltCd) {
        return new Row(
                pkltCd,
                "테스트 주차장",
                "테스트구 테스트동 111-1",
                null, "NW", "1", null, "Y",
                null, null, null, null, null,
                null, null, null, null, null, null
        );
    }
}
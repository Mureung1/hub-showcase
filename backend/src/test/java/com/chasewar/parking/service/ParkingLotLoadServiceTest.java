package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

import com.chasewar.parking.dto.SeoulParkingLotResponse;
import com.chasewar.parking.dto.SeoulParkingLotResponse.GetParkInfo;
import com.chasewar.parking.dto.SeoulParkingLotResponse.GetParkInfo.Result;
import com.chasewar.parking.dto.SeoulParkingLotResponse.GetParkInfo.Row;
import com.chasewar.parking.infra.SeoulParkingLotClient;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotLoadServiceTest extends IntegrationTest {

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
        void success_initialSaveParkingLots() {
            // given
            given(seoulParkingLotClient.fetchPage(anyInt(), anyInt()))
                    .willReturn(responseWith("1000001", "1000002"));

            // when
            parkingLotLoadService.load();

            // then
            assertThat(parkingLotRepository.findAll()).hasSize(2);
        }

        // pkltCd -> UNIQUE
        @DisplayName("같은 데이터를 두 번 적재하면 pkltCd 중복으로 예외가 발생한다")
        @Test
        void fail_secondLoad() {
            // given
            given(seoulParkingLotClient.fetchPage(anyInt(), anyInt()))
                    .willReturn(responseWith("1000001", "1000002"));

            // when
            parkingLotLoadService.load();

            // then
            assertThatThrownBy(() -> parkingLotLoadService.load())
                    .isInstanceOf(DataIntegrityViolationException.class);
        }
    }

    private SeoulParkingLotResponse responseWith(String... pkltCds) {
        List<Row> rows = List.of(
                rowWithPkltCd(pkltCds[0]),
                rowWithPkltCd(pkltCds[1])
        );
        Result result = new Result("INFO-000", "정상 처리되었습니다");

        return new SeoulParkingLotResponse(new GetParkInfo(pkltCds.length, result, rows));
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
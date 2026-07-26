package com.chasewar.parking.api;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.WalkingRoute;
import com.chasewar.parking.infra.walkingroute.WalkingRouteClient;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.ControllerTest;
import com.chasewar.support.fixture.ParkingLotFixtureBuilder;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotControllerTest extends ControllerTest {

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @MockitoBean
    private WalkingRouteClient walkingRouteClient;

    @DisplayName("목적지 좌표로 근처 주차장을 검색할 때")
    @Nested
    class Search {

        @DisplayName("유효한 요청이면 1km 이내 주차장을 200으로 반환한다")
        @Test
        void success_search() throws Exception {
            // given
            parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("12345")
                    .name("역삼동 공영주차장")
                    .coordinates(new Coordinates(37.501, 127.0))
                    .build());

            // when & then
            mockMvc.perform(get("/api/parking-lots")
                            .param("latitude", "37.5")
                            .param("longitude", "127.0")
                    )
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("역삼동 공영주차장"))
                    .andExpect(jsonPath("$[0].payType").value("PAID"));
        }

        @DisplayName("목적지 좌표 파라미터가 없으면 400와 에러 코드를 반환한다")
        @Test
        void fail_notFound() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        }

        @DisplayName("목적지 좌표가 유효 범위를 벗어나면 400과 에러 코드를 반환한다")
        @Test
        void fail_noDestination() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots")
                            .param("latitude", "999")
                            .param("longitude", "127.0")
                    )
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        }

        @DisplayName("좌표가 숫자가 아니면 400과 에러 코드를 반환한다")
        @Test
        void fail_notNumberLatitude() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots")
                            .param("latitude", "abc")
                            .param("longitude", "127.0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        }
    }

    @DisplayName("주차장을 상세 조회할 때")
    @Nested
    class GetDetail {

        @DisplayName("존재하는 id면 상세 정보를 200으로 반환한다")
        @Test
        void success_getDetail() throws Exception {
            // given
            ParkingLot saved = parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10000")
                    .name("역삼동 공영주차장")
                    .fee(new Fee(5000, 30, 1000, 10, 30000))
                    .build());

            // when & then
            mockMvc.perform(get("/api/parking-lots/{id}", saved.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("역삼동 공영주차장"))
                    .andExpect(jsonPath("$.payType").value("PAID"))
                    .andExpect(jsonPath("$.fee.basicFee").value(5000));
        }

        @DisplayName("존재하지 않는 id면 404와 에러 코드를 반환한다")
        @Test
        void fail_notFound() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots/{id}", 999_999L))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND_PARKING_LOT"));
        }

        @DisplayName("목적지 좌표를 함께 보내면 도보거리를 포함해 반환한다")
        @Test
        void success_getDetailWithDestination() throws Exception {
            // given
            ParkingLot saved = parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10001")
                    .coordinates(new Coordinates(37.501, 127.0))
                    .build()
            );
            given(walkingRouteClient.findRoute(
                    new Coordinates(37.501, 127.0),
                    new Coordinates(37.5, 127.0))
            )
                    .willReturn(Optional.of(new WalkingRoute(890, 720)));

            // when & then
            mockMvc.perform(get("/api/parking-lots/{id}", saved.getId())
                            .param("latitude", "37.5")
                            .param("longitude", "127.0")
                    )
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.distanceInfo.distance").value(890))
                    .andExpect(jsonPath("$.distanceInfo.distanceType").value("WALKING"))
                    .andExpect(jsonPath("$.distanceInfo.walkingSeconds").value(720));
        }

        @DisplayName("목적지 좌표가 유효 범위를 벗어나면 400과 에러 코드를 반환한다")
        @Test
        void fail_invalidCoordinates() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots/{id}", 1L)
                            .param("latitude", "90.1")
                            .param("longitude", "127.0")
                    )
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        }
    }
}
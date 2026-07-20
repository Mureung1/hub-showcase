package com.chasewar.parking.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.parking.domain.vo.Coordinates;
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

    private static final Coordinates DESTINATION = new Coordinates(37.5, 127.0);

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @MockitoBean
    private PlaceSearchClient placeSearchClient;

    @DisplayName("목적지로 근처 주차장을 검색할 때")
    @Nested
    class Search {

        @DisplayName("유효한 요청이면 1km 이내 주차장을 200으로 반환한다")
        @Test
        void success_search() throws Exception {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(DESTINATION));
            parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("12345")
                    .name("역삼동 공영주차장")
                    .coordinates(new Coordinates(37.501, 127.0))
                    .build());

            // when & then
            mockMvc.perform(get("/api/parking-lots").param("destination", "강남역"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("역삼동 공영주차장"))
                    .andExpect(jsonPath("$[0].payType").value("PAID"));
        }

        @DisplayName("목적지를 찾지 못하면 404와 에러 코드를 반환한다")
        @Test
        void fail_notFound() throws Exception {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.empty());

            // when & then
            mockMvc.perform(get("/api/parking-lots").param("destination", "알 수 없는 주차장"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND_DESTINATION"));
        }

        @DisplayName("목적지 파라미터가 없으면 400과 에러 코드를 반환한다")
        @Test
        void fail_noDestination() throws Exception {
            // when & then
            mockMvc.perform(get("/api/parking-lots"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("MISSING_REQUEST_PARAMETER"));
        }
    }
}
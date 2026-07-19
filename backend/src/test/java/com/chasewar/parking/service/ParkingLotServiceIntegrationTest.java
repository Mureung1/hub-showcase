package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.IntegrationTest;
import com.chasewar.support.fixture.ParkingLotFixtureBuilder;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotServiceIntegrationTest extends IntegrationTest {

    private static final Coordinates destinationCoordinates = new Coordinates(37.5, 127.0);
    private static final String destination = "강남역";

    @MockitoBean
    private PlaceSearchClient placeSearchClient;

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @Autowired
    private ParkingLotService parkingLotService;

    @DisplayName("목적지 주변 주차장을 검색한다")
    @Nested
    class SearchParkingLots {

        @DisplayName("목적지에서 1km 이내의 주차장만 반환한다")
        @Test
        void success_within1km() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            persistParkingLot("12345", "1km 이내 가까운 주차장", new Coordinates(37.501, 127.0));
            persistParkingLot("30000", "1km 이내 먼 주차장", new Coordinates(37.507, 127.0));
            persistParkingLot("67890", "1km 초과 주차장", new Coordinates(37.52, 127.0));

            // when
            List<ParkingLotSearchResponse> results = parkingLotService.search(destination);

            // then
            assertThat(results)
                    .extracting(ParkingLotSearchResponse::name)
                    .containsExactly("1km 이내 가까운 주차장", "1km 이내 먼 주차장");
        }

        @DisplayName("목적지에서 1km 이내의 주차장 중 가까운 주차장부터 거리순으로 정렬해 반환한다")
        @Test
        void success_sortedByDistance() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            persistParkingLot("30000", "1km 이내 먼 주차장", new Coordinates(37.507, 127.0));
            persistParkingLot("20000", "1km 이내 중간 주차장", new Coordinates(37.504, 127.0));
            persistParkingLot("10000", "1km 이내 가장 가까운 주차장", new Coordinates(37.501, 127.0));

            // when
            List<ParkingLotSearchResponse> results = parkingLotService.search(destination);

            // then
            assertThat(results)
                    .extracting(ParkingLotSearchResponse::name)
                    .containsExactly("1km 이내 가장 가까운 주차장", "1km 이내 중간 주차장", "1km 이내 먼 주차장");
        }

        @DisplayName("좌표가 없는 주차장은 검색 결과에서 제외한다")
        @Test
        void success_excludeNoCoordinates() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            persistParkingLot("10000", "좌표 있는 주차장", new Coordinates(37.501, 127.0));
            persistParkingLot("20000", "좌표 없는 주차장", null);

            // when
            List<ParkingLotSearchResponse> results = parkingLotService.search(destination);

            // then
            assertThat(results)
                    .extracting(ParkingLotSearchResponse::name)
                    .containsExactly("좌표 있는 주차장");
        }

        @DisplayName("주차장 검색 결과는 최대 10개까지 반환한다")
        @Test
        void success_limitTo10() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            for (int i = 1; i <= 15; i++) {
                persistParkingLot(String.valueOf(i), "테스트 주차장" + i, new Coordinates(37.5 + i * 0.000001, 127.0));
            }

            // when
            List<ParkingLotSearchResponse> results = parkingLotService.search(destination);

            // then
            assertThat(results).hasSize(10);
        }
    }

    private void persistParkingLot(String pkltCd, String name, Coordinates coordinates) {
        ParkingLot parkingLot = ParkingLotFixtureBuilder.builder()
                .pkltCd(pkltCd)
                .name(name)
                .coordinates(coordinates)
                .build();

        parkingLotRepository.save(parkingLot);
    }
}
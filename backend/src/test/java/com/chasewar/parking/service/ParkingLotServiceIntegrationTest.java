package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.RealtimeStatus;
import com.chasewar.parking.dto.ParkingLotDetailResponse;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.repository.ParkingLotRealtimeRepository;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.IntegrationTest;
import com.chasewar.support.fixture.ParkingLotFixtureBuilder;
import java.time.LocalDateTime;
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

    @Autowired
    private ParkingLotRealtimeRepository parkingLotRealtimeRepository;

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

        @DisplayName("실시간 데이터가 있는 주차장은 혼잡 상태를 반환한다")
        @Test
        void success_withRealtimeStatus() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10001")
                    .name("실시간 데이터가 있는 주차장")
                    .coordinates(new Coordinates(37.502, 127.0))
                    .build()
            );
            parkingLotRealtimeRepository.save(
                    new ParkingLotRealtime("10001", 100, 60, LocalDateTime.of(2026, 7, 23, 17, 02))
            );

            // when
            List<ParkingLotSearchResponse> responses = parkingLotService.search(destination);

            // then
            assertThat(responses.get(0).name()).isEqualTo("실시간 데이터가 있는 주차장");
            assertThat(responses.get(0).realtimeStatus()).isEqualTo(RealtimeStatus.SPACIOUS.name());
        }

        @DisplayName("실시간 데이터가 없는 주차장은 null를 반환한다")
        @Test
        void success_withoutRealtimeStatus() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.of(destinationCoordinates));
            parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10001")
                    .name("실시간 데이터가 없는 주차장")
                    .coordinates(new Coordinates(37.502, 127.0))
                    .build()
            );

            // when
            List<ParkingLotSearchResponse> responses = parkingLotService.search(destination);

            // then
            assertThat(responses.get(0).name()).isEqualTo("실시간 데이터가 없는 주차장");
            assertThat(responses.get(0).realtimeStatus()).isNull();
        }
    }

    @DisplayName("주차장을 상세 조회할 때")
    @Nested
    class GetDetail {

        @DisplayName("id로 주차장의 상세 정보를 반환한다")
        @Test
        void success_getDetail() {
            // given
            ParkingLot saved = parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10000")
                    .name("역삼동 공영주차장")
                    .fee(new Fee(5000, 30, 1000, 10, 30000))
                    .operatingHours(new OperatingHours("0900", "2200", "0900", "2400", "0900", "2400"))
                    .build());

            // when
            ParkingLotDetailResponse response = parkingLotService.getDetail(saved.getId());

            // then
            assertThat(response.name()).isEqualTo("역삼동 공영주차장");
            assertThat(response.fee().basicFee()).isEqualTo(5000);
            assertThat(response.operatingHours().weekdayStart()).isEqualTo("0900");
            assertThat(response.realtimeInfo()).isNull();
        }

        @DisplayName("실시간 주차장 데이터가 있는 주차장은 상세 정보에 실시간 정보를 포함한다")
        @Test
        void success_getDetailWithRealtime() {
            // given
            ParkingLot saved = parkingLotRepository.save(ParkingLotFixtureBuilder.builder()
                    .pkltCd("10001")
                    .totalSlots(80)
                    .build()
            );
            parkingLotRealtimeRepository.save(
                    new ParkingLotRealtime("10001", 100, 60, LocalDateTime.of(2026, 7, 23, 9, 41, 15))
            );

            // when
            ParkingLotDetailResponse response = parkingLotService.getDetail(saved.getId());

            // then
            assertThat(response.realtimeInfo()).isNotNull();
            assertThat(response.realtimeInfo().availableSlots()).isEqualTo(60);
            assertThat(response.realtimeInfo().totalSlots()).isEqualTo(100);
            assertThat(response.realtimeInfo().status()).isEqualTo(RealtimeStatus.SPACIOUS.name());
            assertThat(response.totalSlots()).isEqualTo(100);
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
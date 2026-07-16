package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.chasewar.geocoding.infra.GeocodingClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperType;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.ParkingKind;
import com.chasewar.parking.domain.vo.PayType;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.support.IntegrationTest;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class ParkingLotGeocodingServiceTest extends IntegrationTest {

    @Autowired
    private ParkingLotGeocodingService parkingLotGeocodingService;

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @MockitoBean
    private GeocodingClient geocodingClient;

    @DisplayName("주차장 좌표를 지오코딩")
    @Nested
    class GeoCode {

        @DisplayName("좌표가 없는 주차장의 좌표를 지오코딩으로 채운다")
        @Test
        void success_fillCoordinates() {
            // given
            ParkingLot saved = parkingLotRepository.save(parkingLotWithoutCoordinates());
            given(geocodingClient.geocode(anyString()))
                    .willReturn(Optional.of(new Coordinates(37.5, 127.0)));

            // when
            parkingLotGeocodingService.geocode();

            // then
            ParkingLot result = parkingLotRepository.findById(saved.getId()).orElseThrow();
            assertThat(result.getCoordinates()).isEqualTo(new Coordinates(37.5, 127.0));
        }

        @DisplayName("지오코딩을 실패하면 좌표를 채우지 않고 스킵한다")
        @Test
        void skipWhenGeoCodeFail() {
            // given
            ParkingLot saved = parkingLotRepository.save(parkingLotWithoutCoordinates());
            given(geocodingClient.geocode(anyString()))
                    .willReturn(Optional.empty());

            // when
            parkingLotGeocodingService.geocode();

            // then
            ParkingLot result = parkingLotRepository.findById(saved.getId()).orElseThrow();
            assertThat(result.getCoordinates()).isNull();
        }
    }

    private ParkingLot parkingLotWithoutCoordinates() {
        return new ParkingLot(
                "1000001",
                "테스트 주차장",
                "서울특별시 강남구 대치동 111-2",
                "강남구",
                null,
                ParkingKind.OUTDOOR,
                OperType.TIME_BASED,
                null,
                new Fee(null, null, null, null, null),
                PayType.PAID,
                new OperatingHours(null, null, null, null, null, null)
        );
    }
}
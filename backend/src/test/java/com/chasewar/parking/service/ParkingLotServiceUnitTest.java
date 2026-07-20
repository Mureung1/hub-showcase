package com.chasewar.parking.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.NotFoundErrorCode;
import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.parking.repository.ParkingLotRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingLotServiceUnitTest {

    @Mock
    private PlaceSearchClient placeSearchClient;

    @Mock
    private ParkingLotRepository parkingLotRepository;

    @InjectMocks
    private ParkingLotService parkingLotService;

    @DisplayName("목적지로 주차장을 검색할 때")
    @Nested
    class Search {

        @DisplayName("목적지를 찾지 못하면 예외를 던진다")
        @Test
        void fail_notFound() {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> parkingLotService.search("알 수 없는 목적지"))
                    .isInstanceOf(ChasewarException.class)
                    .hasMessage(NotFoundErrorCode.NOT_FOUND_DESTINATION.name());
        }
    }

    @DisplayName("주차장을 상세 조회할 때")
    @Nested
    class GetDetail {

        @DisplayName("존재하지 않는 id면 예외를 던진다")
        @Test
        void fail_notFound() {
            // given
            given(parkingLotRepository.findById(anyLong()))
                    .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> parkingLotService.getDetail(12345L))
                    .isInstanceOf(ChasewarException.class)
                    .hasMessage(NotFoundErrorCode.NOT_FOUND_PARKING_LOT.name());
        }
    }
}
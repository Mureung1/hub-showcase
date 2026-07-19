package com.chasewar.parking.api;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

@Disabled
@WebMvcTest(ParkingLotController.class)
class ParkingLotControllerTest {

    @DisplayName("목적지로 근처 주차장을 검색할 때")
    @Nested
    class Search {

        @DisplayName("유효한 요청이면 검색 결과를 200으로 반환한다")
        @Test
        void successSearch() {
            // given

            // when

            // then
        }
    }
}
package com.chasewar.parking.domain.vo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RealtimeStatusTest {

    @DisplayName("주차장 사용 가능 면수 비율에 따라 실시간 혼잡 상태를 나타낸다")
    @ParameterizedTest
    @CsvSource({
            "100, 100, SPACIOUS",
            "100, 80, SPACIOUS",
            "100, 51, SPACIOUS",
            "100, 50, MODERATE",
            "100, 11, MODERATE",
            "100, 10, BUSY",
            "100, 1, BUSY",
            "100, 0, FULL"
    })
    void of_byRatio(int totalSlots, int availableSlots, RealtimeStatus expected) {
        // when
        RealtimeStatus status = RealtimeStatus.of(totalSlots, availableSlots);

        // then
        assertThat(status).isEqualTo(expected);
    }
}
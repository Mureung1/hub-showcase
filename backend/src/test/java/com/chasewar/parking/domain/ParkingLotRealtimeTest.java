package com.chasewar.parking.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ParkingLotRealtimeTest {

    @DisplayName("가용 면수가 0 이상 총 면수 이하면 생성된다")
    @ParameterizedTest
    @CsvSource({
            "100, 0", // 총: 100, 가용 면수: 0
            "100, 100", // 총: 100, 가용 면수: 100
            "100, 30" // 총: 100, 가용 면수: 30
    })
    void success_validAvailableSlots(int totalSlots, int availableSlots) {
        // when & then
        assertThatCode(() -> new ParkingLotRealtime("10001", totalSlots, availableSlots, LocalDateTime.now()))
                .doesNotThrowAnyException();
    }

    @DisplayName("주차장 코드가 null, 빈 값, 공백이면 예외를 던진다")
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" "})
    void fail_invalidPkltCd(String pkltCd) {
        // when & then
        assertThatThrownBy(() -> new ParkingLotRealtime(pkltCd, 100, 50, LocalDateTime.now()))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.MISSING_PARKING_LOT_CODE.name());
    }

    @DisplayName("가용 면수가 음수거나 총 면수보다 크면 예외를 던진다")
    @ParameterizedTest
    @CsvSource({
            "100, -20",
            "100, 110"
    })
    void fail_invalidAvailableSlots(int totalSlots, int availableSlots) {
        // when & then
        assertThatThrownBy(() -> new ParkingLotRealtime("10001", totalSlots, availableSlots, LocalDateTime.now()))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_AVAILABLE_SLOTS.name());
    }

    @DisplayName("총 면수가 음수면 예외를 던진다")
    @Test
    void fail_negativeToTalSlots() {
        // when & then
        assertThatThrownBy(() -> new ParkingLotRealtime("10001", -100, 50, LocalDateTime.now()))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_TOTAL_SLOTS.name());
    }
}
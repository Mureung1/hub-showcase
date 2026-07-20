package com.chasewar.parking.domain.vo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ParkingKindTest {

    @DisplayName("코드를 받아 주차장 타입으로 변환")
    @Nested
    class FromCode {

        @DisplayName("정확한 코드는 해당 주차장 타입으로 변환된다")
        @ParameterizedTest
        @CsvSource({
                "NW, OUTDOOR",
                "NS, ON_STREET"
        })
        void success_exactCode(String code, ParkingKind parkingKind) {
            // then
            assertThat(ParkingKind.fromCode(code)).isEqualTo(parkingKind);
        }

        @DisplayName("잘못된 코드, null, 빈 문자열은 UNKNOWN으로 변환된다")
        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"X"})
        void success_unknown(String code) {
            // then
            assertThat(ParkingKind.fromCode(code)).isEqualTo(ParkingKind.UNKNOWN);
        }
    }
}
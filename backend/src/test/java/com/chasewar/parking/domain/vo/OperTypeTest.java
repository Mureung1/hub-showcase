package com.chasewar.parking.domain.vo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class OperTypeTest {

    @DisplayName("코드를 받아 운영 타입으로 변환")
    @Nested
    class FromCode {

        @DisplayName("정확한 코드는 해당 운영 타입으로 변환된다")
        @ParameterizedTest
        @CsvSource({
                "1, TIME_BASED",
                "2, RESIDENT_PRIORITY",
                "3, TIME_AND_RESIDENT"
        })
        void success_exactCode(String code, OperType operType) {
            // then
            assertThat(OperType.fromCode(code)).isEqualTo(operType);
        }

        @DisplayName("잘못된 코드, null, 빈 문자열은 UNKNOWN으로 변환된다")
        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"X"})
        void success_unknown(String code) {
            assertThat(OperType.fromCode(code)).isEqualTo(OperType.UNKNOWN);
        }
    }
}
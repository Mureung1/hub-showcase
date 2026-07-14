package com.chasewar.parking.domain.vo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class PayTypeTest {

    @DisplayName("코드를 받아 유/무료 여부로 변환")
    @Nested
    class FromCode {

        @DisplayName("정확한 코드는 해당 요금 타입으로 변환된다")
        @ParameterizedTest
        @CsvSource({
                "Y, PAID",
                "N, FREE"
        })
        void success_exactCode(String code, PayType payType) {
            // then
            assertThat(PayType.fromCode(code)).isEqualTo(payType);
        }

        @DisplayName("잘못된 코드, null, 빈 문자열은 UNKNOWN으로 변환된다")
        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"X"})
        void fallbackToUnknown(String code) {
            // then
            assertThat(PayType.fromCode(code)).isEqualTo(PayType.UNKNOWN);
        }
    }
}
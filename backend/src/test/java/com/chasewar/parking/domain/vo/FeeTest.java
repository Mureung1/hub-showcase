package com.chasewar.parking.domain.vo;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class FeeTest {

    @DisplayName("Fee의 모든 값이 null 또는 0 이상이면 생성된다")
    @Test
    void success_valid() {
        // when & then
        assertThatCode(() -> new Fee(5000, 30, 1000, 10, 30000))
                .doesNotThrowAnyException();
        assertThatCode(() -> new Fee(5000, 30, null, null, 20000))
                .doesNotThrowAnyException();
        assertThatCode(() -> new Fee(null, null, null, null, null))
                .doesNotThrowAnyException();
    }

    @DisplayName("Fee의 어느 값이든 음수면 예외를 던진다")
    @ParameterizedTest
    @CsvSource({
            "-5000, 30, 1000, 10, 20000",
            "5000, -30, 1000, 10, 20000",
            "5000, 30, -1000, 10, 20000",
            "5000, 30, 1000, -10, 20000",
            "5000, 30, 1000, 10, -20000",
    })
    void fail_negative(int basicFee,
                       int basicMinutes,
                       int extraUnitFee,
                       int extraUnitMin,
                       int dayMaxFee
    ) {
        // when & then
        assertThatThrownBy(() -> new Fee(basicFee, basicMinutes, extraUnitFee, extraUnitMin, dayMaxFee))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_FEE.name());
    }
}
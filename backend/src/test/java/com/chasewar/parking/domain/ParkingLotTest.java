package com.chasewar.parking.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import com.chasewar.support.fixture.ParkingLotFixtureBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ParkingLotTest {

    @DisplayName("유효한 주차장 코드면 주차장 엔티티가 생성된다")
    @Test
    void success_validPkltCd() {
        // when & then
        assertThatCode(() -> ParkingLotFixtureBuilder.builder()
                .pkltCd("10001")
                .build()
        )
                .doesNotThrowAnyException();
    }

    @DisplayName("주차장 코드가 null, 빈 값, 공백이면 예외를 던진다")
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" "})
    void fail_missingPkltCd(String pkltCd) {
        // when & then
        assertThatThrownBy(() -> ParkingLotFixtureBuilder.builder()
                .pkltCd(pkltCd)
                .build()
        )
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.MISSING_PARKING_LOT_CODE.name());
    }
}
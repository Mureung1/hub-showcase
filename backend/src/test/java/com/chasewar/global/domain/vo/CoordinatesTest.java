package com.chasewar.global.domain.vo;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class CoordinatesTest {

    @DisplayName("유효 범위의 위/경도 값이면 좌표가 생성된다")
    @ParameterizedTest
    @CsvSource({"37.5, 127.0", "90.0, 180.0", "-90.0, -180.0"})
    void success_valid(Double latitude, Double longitude) {
        // when & then
        assertThatCode(() -> new Coordinates(latitude, longitude))
                .doesNotThrowAnyException();
    }

    @DisplayName("위도가 범위를 벗어나면 예외를 던진다")
    @ParameterizedTest
    @ValueSource(doubles = {90.1, -90.1})
    void fail_latitudeOutOfRange(Double latitude) {
        // when & then
        assertThatThrownBy(() -> new Coordinates(latitude, 0.0))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_COORDINATES.name());
    }

    @DisplayName("경도가 범위를 벗어나면 예외를 던진다")
    @ParameterizedTest
    @ValueSource(doubles = {180.1, -180.1})
    void fail_longitudeOutOfRange(Double longitude) {
        // when & then
        assertThatThrownBy(() -> new Coordinates(0.0, longitude))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_COORDINATES.name());
    }

    @DisplayName("위도 또는 경도가 null이면 예외를 던진다")
    @ParameterizedTest
    @CsvSource(value = {"null, 0.0", "0.0, null"}, nullValues = "null")
    void fail_null(Double latitude, Double longitude) {
        // when & then
        assertThatThrownBy(() -> new Coordinates(latitude, longitude))
                .isInstanceOf(ChasewarException.class)
                .hasMessage(InternalServerErrorCode.INVALID_COORDINATES.name());
    }
}
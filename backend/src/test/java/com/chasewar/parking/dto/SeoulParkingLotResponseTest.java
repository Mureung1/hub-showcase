package com.chasewar.parking.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Row;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;

class SeoulParkingLotResponseTest {

    @DisplayName("주소를 엔티티로 매핑")
    @Nested
    class ToParkingLotAddress {

        @DisplayName("구는 주소의 첫 토큰으로, 주소는 앞에 서울특별시를 붙여 저장한다")
        @Test
        void success_parseAddress() {
            // given
            Row row = rowWithAddress("강남구 대치동 111-2");

            // when
            ParkingLot parkingLot = row.toParkingLot();

            // then
            assertThat(parkingLot.getAddress()).isEqualTo("서울특별시 강남구 대치동 111-2");
            assertThat(parkingLot.getDistrict()).isEqualTo("강남구");
        }

        @DisplayName("주소가 없으면 구, 주소는 null로 저장된다")
        @ParameterizedTest
        @NullAndEmptySource
        void nullWhenNoAddress(String address) {
            // given
            Row row = rowWithAddress(address);

            // when
            ParkingLot parkingLot = row.toParkingLot();

            // then
            assertThat(parkingLot.getAddress()).isNull();
            assertThat(parkingLot.getDistrict()).isNull();
        }

        private Row rowWithAddress(String address) {
            return new Row(
                    "1111111",
                    "강남구 공영주차장",
                    address,
                    null,
                    "NW",
                    "1",
                    null,
                    "Y",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }
    }
}
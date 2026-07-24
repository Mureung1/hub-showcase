package com.chasewar.parking.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Row;
import java.util.List;
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
            ParkingLot parkingLot = Row.toParkingLots(List.of(row)).get(0);

            // then
            assertThat(parkingLot.getAddress()).isEqualTo("서울특별시 강남구 대치동 111-2");
            assertThat(parkingLot.getDistrict()).isEqualTo("강남구");
        }

        @DisplayName("주소가 없으면 구, 주소는 null로 저장된다")
        @ParameterizedTest
        @NullAndEmptySource
        void success_noAddress(String address) {
            // given
            Row row = rowWithAddress(address);

            // when
            ParkingLot parkingLot = Row.toParkingLots(List.of(row)).get(0);

            // then
            assertThat(parkingLot.getAddress()).isNull();
            assertThat(parkingLot.getDistrict()).isNull();
        }
    }

    @DisplayName("같은 pkltCd 행들을 하나의 주차장으로 집계")
    @Nested
    class ToParkingLots {

        @DisplayName("같은 pkltCd 행들의 주차면 수를 합쳐 총 주차면 수로 저장한다")
        @Test
        void success_sumTotalSlots() {
            // given
            List<Row> rows = List.of(
                    rowWithTotalSlots("10001", 1),
                    rowWithTotalSlots("10001", 1),
                    rowWithTotalSlots("10001", 1)
            );

            // when
            List<ParkingLot> parkingLots = Row.toParkingLots(rows);

            // then
            assertThat(parkingLots).hasSize(1);
            assertThat(parkingLots.get(0).getTotalSlots()).isEqualTo(3);
        }

        @DisplayName("서로 다른 pkltCd는 별개 주차장으로 집계한다")
        @Test
        void success_diffParkingLots() {
            // given
            List<Row> rows = List.of(
                    rowWithTotalSlots("10001", 11),
                    rowWithTotalSlots("10002", 22)
            );

            // when
            List<ParkingLot> parkingLots = Row.toParkingLots(rows);

            // then
            assertThat(parkingLots).hasSize(2);
        }
    }

    @DisplayName("버스전용 주차장은 적재에서 제외")
    @Nested
    class ExcludeBusOnly {

        @DisplayName("버스전용 주차장은 정적 데이터 적재에서 제외한다")
        @Test
        void success_excludeBusOnlyParkingLot() {
            // given
            List<Row> rows = List.of(
                    rowWithOperType("10001", "1"),
                    rowWithOperType("10002", "4")
            );

            // when
            List<ParkingLot> parkingLots = Row.toParkingLots(rows);

            // then
            assertThat(parkingLots)
                    .extracting(ParkingLot::getPkltCd)
                    .containsExactly("10001");
        }

        @DisplayName("시간제 + 버스전용 주차장은 적재한다")
        @Test
        void success_loadTimeAndBus() {
            // given
            List<Row> rows = List.of(
                    rowWithOperType("10001", "4"),
                    rowWithOperType("10002", "5")
            );

            // when
            List<ParkingLot> parkingLots = Row.toParkingLots(rows);

            // then
            assertThat(parkingLots)
                    .extracting(ParkingLot::getPkltCd)
                    .containsExactly("10002");
        }
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

    private Row rowWithTotalSlots(String pkltCd, Integer totalSlots) {
        return new Row(
                pkltCd,
                "테스트 주차장",
                "강남구 역삼동 1-2",
                null,
                "NW",
                "1",
                totalSlots == null ? null : totalSlots.doubleValue(),
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

    private Row rowWithOperType(String pkltCd, String operTypeCode) {
        return new Row(
                pkltCd,
                "테스트 주차장",
                "강남구 역삼동 1-2",
                null,
                "NW",
                operTypeCode,
                100.0,
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

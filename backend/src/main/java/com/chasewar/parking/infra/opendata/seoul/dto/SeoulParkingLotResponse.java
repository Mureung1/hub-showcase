package com.chasewar.parking.infra.opendata.seoul.dto;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperType;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.ParkingKind;
import com.chasewar.parking.domain.vo.PayType;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record SeoulParkingLotResponse(
        @JsonProperty("GetParkInfo") GetParkInfo getParkInfo
) {

    public record GetParkInfo(
            @JsonProperty("list_total_count") int listTotalCount,
            @JsonProperty("RESULT") Result result,
            @JsonProperty("row") List<Row> rows
    ) {
        public record Result(
                @JsonProperty("CODE") String code,
                @JsonProperty("MESSAGE") String message
        ) {
        }

        public record Row(
                @JsonProperty("PKLT_CD") String pkltCd,
                @JsonProperty("PKLT_NM") String name,
                @JsonProperty("ADDR") String address,
                @JsonProperty("TELNO") String tel,
                @JsonProperty("PKLT_KND") String parkingKindCode,
                @JsonProperty("OPER_SE") String operTypeCode,
                @JsonProperty("TPKCT") Double totalSlots,
                @JsonProperty("CHGD_FREE_SE") String payTypeCode,
                @JsonProperty("PRK_CRG") Double basicFee,
                @JsonProperty("PRK_HM") Double basicMinutes,
                @JsonProperty("ADD_CRG") Double extraUnitFee,
                @JsonProperty("ADD_UNIT_TM_MNT") Double extraUnitMin,
                @JsonProperty("DLY_MAX_CRG") Double dayMaxFee,
                @JsonProperty("WD_OPER_BGNG_TM") String weekdayStart,
                @JsonProperty("WD_OPER_END_TM") String weekdayEnd,
                @JsonProperty("WE_OPER_BGNG_TM") String weekendStart,
                @JsonProperty("WE_OPER_END_TM") String weekendEnd,
                @JsonProperty("LHLDY_BGNG") String holidayStart,
                @JsonProperty("LHLDY") String holidayEnd
        ) {
            private static final String SEOUL_CITY_PREFIX = "서울특별시 ";
            // 승용차 주차장이 아니지만 데이터에 이를 구분하는 코드가 없는 주차장 목록
            // 1236612 남대문 화물 공영주차장(시)
            // 1415512 견인보관소(구)
            // 173169  견인보관소 노외(구)
            private static final Set<String> EXCLUDED_PKLT_CDS = Set.of("1236612", "1415512", "173169");

            public static List<ParkingLot> toParkingLots(List<Row> rows) {
                return rows.stream()
                        .filter(Row::isForPassengerCar)
                        .collect(Collectors.groupingBy(Row::pkltCd, LinkedHashMap::new, Collectors.toList()))
                        .values().stream()
                        .map(Row::mergeToParkingLot)
                        .toList();
            }

            private boolean isForPassengerCar() {
                return !isBusOnly() && !EXCLUDED_PKLT_CDS.contains(pkltCd);
            }

            private boolean isBusOnly() {
                return OperType.fromCode(operTypeCode) == OperType.BUS_ONLY;
            }

            private static ParkingLot mergeToParkingLot(List<Row> samePkltCdRows) {
                Row representativeRow = samePkltCdRows.get(0);
                int totalSlots = samePkltCdRows.stream()
                        .filter(row -> row.totalSlots() != null)
                        .mapToInt(row -> row.totalSlots().intValue())
                        .sum();

                return toParkingLot(representativeRow, totalSlots);
            }

            private static ParkingLot toParkingLot(Row row, int totalSlots) {
                return new ParkingLot(
                        row.pkltCd(),
                        row.name(),
                        row.toFullAddress(),
                        row.toDistrict(),
                        emptyToNull(row.tel()),
                        ParkingKind.fromCode(row.parkingKindCode()),
                        OperType.fromCode(row.operTypeCode()),
                        totalSlots,
                        new Fee(
                                toInteger(row.basicFee()),
                                toInteger(row.basicMinutes()),
                                toInteger(row.extraUnitFee()),
                                toInteger(row.extraUnitMin()),
                                toInteger(row.dayMaxFee())
                        ),
                        PayType.fromCode(row.payTypeCode()),
                        new OperatingHours(
                                row.weekdayStart(),
                                row.weekdayEnd(),
                                row.weekendStart(),
                                row.weekendEnd(),
                                row.holidayStart(),
                                row.holidayEnd()
                        )
                );
            }

            private String toFullAddress() {
                if (address == null || address.isBlank()) {
                    return null;
                }
                return SEOUL_CITY_PREFIX + address.trim();
            }

            private String toDistrict() {
                if (address == null || address.isBlank()) {
                    return null;
                }
                return address.trim().split(" ")[0];
            }

            private static Integer toInteger(Double value) {
                if (value == null) {
                    return null;
                }
                return value.intValue();
            }

            private static String emptyToNull(String value) {
                if (value == null || value.isBlank()) {
                    return null;
                }
                return value;
            }
        }
    }
}

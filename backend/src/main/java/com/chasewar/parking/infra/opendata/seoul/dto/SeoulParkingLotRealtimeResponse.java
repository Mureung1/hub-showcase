package com.chasewar.parking.infra.opendata.seoul.dto;

import com.chasewar.parking.domain.ParkingLotRealtime;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public record SeoulParkingLotRealtimeResponse(
        @JsonProperty("GetParkingInfo") GetParkingInfo getParkingInfo
) {

    public record GetParkingInfo(
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
                @JsonProperty("TPKCT") Double totalSlots,
                @JsonProperty("NOW_PRK_VHCL_CNT") Double occupiedSlots,
                @JsonProperty("NOW_PRK_VHCL_UPDT_TM") String sourceUpdatedTime
        ) {

            private static final DateTimeFormatter SOURCE_TIME_FORMAT =
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            public ParkingLotRealtime toParkingLotRealtime() {
                int total = toInt(totalSlots);
                int available = clampAvailable(total, toInt(occupiedSlots));

                return new ParkingLotRealtime(pkltCd, total, available, toSourceUpdatedAt());
            }

            private static int toInt(Double value) {
                if (value == null) {
                    return 0;
                }

                return value.intValue();
            }

            private static int clampAvailable(int total, int occupied) {
                return Math.max(0, total - occupied);
            }

            private LocalDateTime toSourceUpdatedAt() {
                if (sourceUpdatedTime == null || sourceUpdatedTime.isBlank()) {
                    return null;
                }

                return LocalDateTime.parse(sourceUpdatedTime, SOURCE_TIME_FORMAT);
            }
        }
    }
}

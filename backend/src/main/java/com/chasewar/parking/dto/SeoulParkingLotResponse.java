package com.chasewar.parking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

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
        }
    }
}

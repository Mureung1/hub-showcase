package com.chasewar.parking.dto;

import com.chasewar.parking.domain.vo.Fee;

public record FeeResponse(
        Integer basicFee,
        Integer basicMinutes,
        Integer extraUnitFee,
        Integer extraUnitMin,
        Integer dayMaxFee
) {

    public static FeeResponse from(Fee fee) {
        if (fee == null) {
            return null;
        }

        return new FeeResponse(
                fee.basicFee(),
                fee.basicMinutes(),
                fee.extraUnitFee(),
                fee.extraUnitMin(),
                fee.dayMaxFee()
        );
    }
}

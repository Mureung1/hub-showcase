package com.chasewar.parking.domain.vo;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import jakarta.persistence.Embeddable;

@Embeddable
public record Fee(
        Integer basicFee,
        Integer basicMinutes,
        Integer extraUnitFee,
        Integer extraUnitMin,
        Integer dayMaxFee
) {

    public Fee {
        validate(basicFee);
        validate(basicMinutes);
        validate(extraUnitFee);
        validate(extraUnitMin);
        validate(dayMaxFee);
    }

    private static void validate(Integer value) {
        if (value != null && value < 0) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_FEE);
        }
    }
}

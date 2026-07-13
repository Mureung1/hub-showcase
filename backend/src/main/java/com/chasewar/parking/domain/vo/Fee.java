package com.chasewar.parking.domain.vo;

import jakarta.persistence.Embeddable;

@Embeddable
public record Fee(
        Integer basicFee,
        Integer basicMinutes,
        Integer extraUnitFee,
        Integer extraUnitMin,
        Integer dayMaxFee
) {
}

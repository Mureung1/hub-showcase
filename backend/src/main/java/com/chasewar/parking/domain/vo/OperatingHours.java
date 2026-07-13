package com.chasewar.parking.domain.vo;

import jakarta.persistence.Embeddable;

@Embeddable
public record OperatingHours(
        String weekdayStart,
        String weekdayEnd,
        String weekendStart,
        String weekendEnd,
        String holidayStart,
        String holidayEnd
) {
}

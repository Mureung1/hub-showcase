package com.chasewar.parking.dto;

import com.chasewar.parking.domain.vo.OperatingHours;

public record OperatingHoursResponse(
        String weekdayStart,
        String weekdayEnd,
        String weekendStart,
        String weekendEnd,
        String holidayStart,
        String holidayEnd
) {

    public static OperatingHoursResponse from(OperatingHours operatingHours) {
        if (operatingHours == null) {
            return null;
        }

        return new OperatingHoursResponse(
                operatingHours.weekdayStart(),
                operatingHours.weekdayEnd(),
                operatingHours.weekendStart(),
                operatingHours.weekendEnd(),
                operatingHours.holidayStart(),
                operatingHours.holidayEnd()
        );
    }
}

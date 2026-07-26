package com.chasewar.parking.dto;

import com.chasewar.global.domain.vo.Coordinates;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record ParkingLotDetailRequest(
        @DecimalMin("-90.0") @DecimalMax("90.0")
        Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0")
        Double longitude
) {

    public Coordinates toCoordinates() {
        if (latitude == null || longitude == null) {
            return null;
        }

        return new Coordinates(latitude, longitude);
    }
}

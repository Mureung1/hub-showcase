package com.chasewar.place.dto;

import com.chasewar.global.domain.vo.Coordinates;

public record CoordinatesResponse(
        Double latitude,
        Double longitude
) {

    public static CoordinatesResponse from(Coordinates coordinates) {
        return new CoordinatesResponse(coordinates.latitude(), coordinates.longitude());
    }
}

package com.chasewar.place.dto;

import com.chasewar.place.domain.Place;

public record PlaceResponse(
        String name,
        String address,
        CoordinatesResponse coordinates
) {

    public static PlaceResponse from(Place place) {
        return new PlaceResponse(
                place.name(),
                place.address(),
                CoordinatesResponse.from(place.coordinates())
        );
    }
}

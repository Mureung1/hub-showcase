package com.placepick.recommendation.application.port.out;

import java.util.Objects;

public record PlaceSearchItem(
    String name,
    String link,
    String category,
    String description,
    String address,
    String roadAddress,
    String longitude,
    String latitude
) {

    public PlaceSearchItem {
        name = Objects.requireNonNull(name, "name");
        link = Objects.requireNonNull(link, "link");
        category = Objects.requireNonNull(category, "category");
        description = Objects.requireNonNull(description, "description");
        address = Objects.requireNonNull(address, "address");
        roadAddress = Objects.requireNonNull(roadAddress, "roadAddress");
        longitude = Objects.requireNonNull(longitude, "longitude");
        latitude = Objects.requireNonNull(latitude, "latitude");
    }
}

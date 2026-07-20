package com.chasewar.parking.domain.vo;

import static java.lang.Math.atan2;
import static java.lang.Math.cos;
import static java.lang.Math.sin;
import static java.lang.Math.sqrt;
import static java.lang.Math.toRadians;

import jakarta.persistence.Embeddable;

@Embeddable
public record Coordinates(
        Double latitude,
        Double longitude
) {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    public double distanceTo(Coordinates target) {
        double latDiff = toRadians(target.latitude - this.latitude);
        double lonDiff = toRadians(target.longitude - this.longitude);

        double haversine = sin(latDiff / 2) * sin(latDiff / 2)
                + cos(toRadians(this.latitude)) * cos(toRadians(target.latitude))
                * sin(lonDiff / 2) * sin(lonDiff / 2);
        double centralAngle = 2 * atan2(sqrt(haversine), sqrt(1 - haversine));

        return EARTH_RADIUS_METERS * centralAngle;
    }
}

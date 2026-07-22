package com.chasewar.parking.domain.vo;

import static java.lang.Math.atan2;
import static java.lang.Math.cos;
import static java.lang.Math.sin;
import static java.lang.Math.sqrt;
import static java.lang.Math.toRadians;

import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import jakarta.persistence.Embeddable;

@Embeddable
public record Coordinates(
        Double latitude,
        Double longitude
) {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private static final double MIN_LATITUDE = -90.0;
    private static final double MAX_LATITUDE = 90.0;
    private static final double MIN_LONGITUDE = -180.0;
    private static final double MAX_LONGITUDE = 180.0;

    public Coordinates {
        if (latitude == null || longitude == null) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_COORDINATES);
        }
        if (latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_COORDINATES);
        }
        if (longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_COORDINATES);
        }
    }

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

package com.chasewar.parking.dto;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.DistanceType;
import com.chasewar.parking.domain.vo.RealtimeStatus;
import com.chasewar.parking.domain.vo.WalkingRoute;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.time.LocalDateTime;

public record ParkingLotDetailResponse(
        Long id,
        String name,
        String address,
        String tel,
        String parkingKind,
        String operType,
        Integer totalSlots,
        String payType,
        FeeResponse fee,
        OperatingHoursResponse operatingHours,
        RealtimeResponse realtimeInfo,
        DistanceResponse distanceInfo
) {

    public static ParkingLotDetailResponse from(
            ParkingLotDetailProjection projection,
            Coordinates destinationCoordinates,
            WalkingRoute walkingRoute
    ) {
        return new ParkingLotDetailResponse(
                projection.id(),
                projection.name(),
                projection.address(),
                projection.tel(),
                projection.parkingKind().name(),
                projection.operType().name(),
                resolveTotalSlots(projection),
                projection.payType().name(),
                FeeResponse.from(projection.fee()),
                OperatingHoursResponse.from(projection.operatingHours()),
                RealtimeResponse.from(projection),
                DistanceResponse.from(projection, destinationCoordinates, walkingRoute)
        );
    }

    private static Integer resolveTotalSlots(ParkingLotDetailProjection projection) {
        if (projection.realtimeTotalSlots() != null) {
            return projection.realtimeTotalSlots();
        }

        return projection.totalSlots();
    }

    public record RealtimeResponse(
            int availableSlots,
            int totalSlots,
            String status,
            LocalDateTime sourceUpdatedAt
    ) {

        private static RealtimeResponse from(ParkingLotDetailProjection projection) {
            if (projection.availableSlots() == null) {
                return null;
            }

            return new RealtimeResponse(
                    projection.availableSlots(),
                    projection.realtimeTotalSlots(),
                    RealtimeStatus.of(projection.realtimeTotalSlots(), projection.availableSlots()).name(),
                    projection.sourceUpdatedAt()
            );
        }
    }

    public record DistanceResponse(
            int distance,
            String distanceType,
            Integer walkingSeconds
    ) {

        private static DistanceResponse from(
                ParkingLotDetailProjection projection,
                Coordinates destinationCoordinates,
                WalkingRoute walkingRoute
        ) {
            if (destinationCoordinates == null || projection.coordinates() == null) {
                return null;
            }

            return new DistanceResponse(
                    resolveDistance(projection, destinationCoordinates, walkingRoute),
                    resolveDistanceType(walkingRoute),
                    resolveWalkingSeconds(walkingRoute)
            );
        }

        private static int resolveDistance(
                ParkingLotDetailProjection projection,
                Coordinates destinationCoordinates,
                WalkingRoute walkingRoute
        ) {
            if (walkingRoute == null) {
                return (int) Math.round(destinationCoordinates.distanceTo(projection.coordinates()));
            }

            return walkingRoute.distanceMeters();
        }

        private static String resolveDistanceType(WalkingRoute walkingRoute) {
            if (walkingRoute == null) {
                return DistanceType.STRAIGHT.name();
            }

            return DistanceType.WALKING.name();
        }

        private static Integer resolveWalkingSeconds(WalkingRoute walkingRoute) {
            if (walkingRoute == null) {
                return null;
            }

            return walkingRoute.durationSeconds();
        }
    }
}

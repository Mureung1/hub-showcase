package com.chasewar.parking.dto;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.domain.vo.DistanceType;
import com.chasewar.parking.domain.vo.RealtimeStatus;
import com.chasewar.parking.domain.vo.WalkingRoute;

public record ParkingLotSearchResponse(
        Long id,
        String name,
        String address,
        int distance,
        String distanceType,
        Integer walkingSeconds,
        String payType,
        String realtimeStatus
) {

    public static ParkingLotSearchResponse from(
            ParkingLot parkingLot,
            double straightDistanceMeters,
            WalkingRoute walkingRoute,
            ParkingLotRealtime parkingLotRealtime
    ) {
        return new ParkingLotSearchResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                resolveDistance(straightDistanceMeters, walkingRoute),
                resolveDistanceType(walkingRoute),
                resolveWalkingSeconds(walkingRoute),
                parkingLot.getPayType().name(),
                resolveStatus(parkingLotRealtime)
        );
    }

    private static int resolveDistance(double straightDistanceMeters, WalkingRoute walkingRoute) {
        if (walkingRoute == null) {
            return (int) Math.round(straightDistanceMeters);
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

    private static String resolveStatus(ParkingLotRealtime parkingLotRealtime) {
        if (parkingLotRealtime == null) {
            return null;
        }

        return RealtimeStatus.of(
                parkingLotRealtime.getTotalSlots(),
                parkingLotRealtime.getAvailableSlots()
        ).name();
    }
}

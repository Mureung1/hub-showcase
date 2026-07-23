package com.chasewar.parking.dto;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.domain.vo.RealtimeStatus;

public record ParkingLotSearchResponse(
        Long id,
        String name,
        String address,
        int distance,
        String payType,
        String realtimeStatus
) {

    public static ParkingLotSearchResponse from(
            ParkingLot parkingLot,
            double distance,
            ParkingLotRealtime parkingLotRealtime
    ) {
        return new ParkingLotSearchResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                (int) Math.round(distance),
                parkingLot.getPayType().name(),
                resolveStatus(parkingLotRealtime)
        );
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

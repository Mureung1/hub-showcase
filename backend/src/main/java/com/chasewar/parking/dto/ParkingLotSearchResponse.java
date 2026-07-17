package com.chasewar.parking.dto;

import com.chasewar.parking.domain.ParkingLot;

public record ParkingLotSearchResponse(
        Long id,
        String name,
        String address,
        int distance,
        String payType
) {

    public static ParkingLotSearchResponse from(ParkingLot parkingLot, double distance) {
        return new ParkingLotSearchResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                (int) Math.round(distance),
                parkingLot.getPayType().name()
        );
    }
}

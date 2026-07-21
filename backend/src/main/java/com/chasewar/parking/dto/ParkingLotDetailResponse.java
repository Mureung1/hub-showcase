package com.chasewar.parking.dto;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperatingHours;

public record ParkingLotDetailResponse(
        Long id,
        String name,
        String address,
        String tel,
        String parkingKind,
        String operType,
        Integer totalSlots,
        String payType,
        Fee fee,
        OperatingHours operatingHours
) {

    public static ParkingLotDetailResponse from(ParkingLot parkingLot) {
        return new ParkingLotDetailResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getTel(),
                parkingLot.getParkingKind().name(),
                parkingLot.getOperType().name(),
                parkingLot.getTotalSlots(),
                parkingLot.getPayType().name(),
                parkingLot.getFee(),
                parkingLot.getOperatingHours()
        );
    }
}

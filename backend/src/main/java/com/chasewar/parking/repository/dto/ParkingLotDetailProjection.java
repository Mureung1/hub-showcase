package com.chasewar.parking.repository.dto;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperType;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.ParkingKind;
import com.chasewar.parking.domain.vo.PayType;
import java.time.LocalDateTime;

public record ParkingLotDetailProjection(
        Long id,
        String name,
        String address,
        String tel,
        ParkingKind parkingKind,
        OperType operType,
        Integer totalSlots,
        PayType payType,
        Fee fee,
        OperatingHours operatingHours,
        Coordinates coordinates,
        Integer availableSlots,
        Integer realtimeTotalSlots,
        LocalDateTime sourceUpdatedAt
) {
}

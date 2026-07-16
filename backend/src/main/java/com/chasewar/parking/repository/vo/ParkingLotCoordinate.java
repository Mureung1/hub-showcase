package com.chasewar.parking.repository.vo;

import com.chasewar.parking.domain.vo.Coordinates;

public record ParkingLotCoordinate(
        Long id,
        Coordinates coordinates
) {
}

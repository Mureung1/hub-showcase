package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLot;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, Long> {

    List<ParkingLot> findByCoordinatesLatitudeIsNull();

    List<ParkingLot> findByCoordinatesLatitudeIsNotNull();
}

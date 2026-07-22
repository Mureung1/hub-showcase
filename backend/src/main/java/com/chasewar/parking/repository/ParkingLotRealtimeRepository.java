package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLotRealtime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingLotRealtimeRepository extends JpaRepository<ParkingLotRealtime, Long> {
}

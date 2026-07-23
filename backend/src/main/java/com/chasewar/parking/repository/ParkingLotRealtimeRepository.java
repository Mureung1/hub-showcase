package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLotRealtime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingLotRealtimeRepository extends JpaRepository<ParkingLotRealtime, Long> {

    List<ParkingLotRealtime> findByPkltCdIn(Collection<String> pkltCds);
}

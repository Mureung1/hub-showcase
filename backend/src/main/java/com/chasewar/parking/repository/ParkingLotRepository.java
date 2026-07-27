package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, Long> {

    List<ParkingLot> findByCoordinatesLatitudeIsNull();

    List<ParkingLot> findByCoordinatesLatitudeIsNotNull();

    @Query("""
            SELECT new com.chasewar.parking.repository.dto.ParkingLotDetailProjection(
                p.id, p.name, p.address, p.tel,
                p.parkingKind, p.operType, p.totalSlots, p.payType,
                p.fee, p.operatingHours, p.coordinates,
                r.availableSlots, r.totalSlots, r.sourceUpdatedAt
            )
            FROM ParkingLot p
            LEFT JOIN ParkingLotRealtime r ON r.pkltCd = p.pkltCd
            WHERE p.id = :id
            """)
    Optional<ParkingLotDetailProjection> findDetailById(@Param("id") Long id);
}

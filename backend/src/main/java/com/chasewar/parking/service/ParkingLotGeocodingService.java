package com.chasewar.parking.service;

import com.chasewar.geocoding.infra.GeocodingClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.repository.ParkingLotJdbcRepository;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.parking.repository.vo.ParkingLotCoordinate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingLotGeocodingService {

    private final ParkingLotRepository parkingLotRepository;
    private final GeocodingClient geocodingClient;
    private final ParkingLotJdbcRepository parkingLotJdbcRepository;

    @Transactional
    public void geocode() {
        List<ParkingLot> targets = parkingLotRepository.findByCoordinatesLatitudeIsNull();

        List<ParkingLotCoordinate> updates = new ArrayList<>();
        for (ParkingLot parkingLot : targets) {
            Optional<Coordinates> coordinates = geocodingClient.geocode(parkingLot.getAddress());
            if (coordinates.isEmpty()) {
                log.warn("[지오코딩] 실패 - id={}, address={}", parkingLot.getId(), parkingLot.getAddress());
                continue;
            }
            updates.add(new ParkingLotCoordinate(parkingLot.getId(), coordinates.get()));
        }

        parkingLotJdbcRepository.updateCoordinates(updates);
    }
}

package com.chasewar.parking.service;

import com.chasewar.geocoding.infra.GeocodingClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.repository.ParkingLotRepository;
import java.util.List;
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

    @Transactional
    public void geocode() {
        List<ParkingLot> targets = parkingLotRepository.findByCoordinatesLatitudeIsNull();

        for (ParkingLot parkingLot : targets) {
            geocodingClient.geocode(parkingLot.getAddress())
                    .ifPresentOrElse(
                            parkingLot::assignCoordinates,
                            () -> log.warn("[지오코딩 실패] - id={}, address={}",
                                    parkingLot.getId(), parkingLot.getAddress())
                    );
        }
    }
}

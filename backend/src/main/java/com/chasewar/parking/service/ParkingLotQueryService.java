package com.chasewar.parking.service;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.NotFoundErrorCode;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.repository.ParkingLotRealtimeRepository;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParkingLotQueryService {

    private static final double SEARCH_MAX_RADIUS_METERS = 1_000.0;

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotRealtimeRepository parkingLotRealtimeRepository;

    @Transactional(readOnly = true)
    public List<ParkingLot> findWithinRadius(Coordinates destinationCoordinates) {
        return parkingLotRepository.findByCoordinatesLatitudeIsNotNull()
                .stream()
                .filter(parkingLot ->
                        destinationCoordinates.distanceTo(parkingLot.getCoordinates()) <= SEARCH_MAX_RADIUS_METERS
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, ParkingLotRealtime> findRealtimeByPkltCd(List<ParkingLot> parkingLots) {
        List<String> pkltCds = parkingLots.stream()
                .map(ParkingLot::getPkltCd)
                .toList();

        return parkingLotRealtimeRepository.findByPkltCdIn(pkltCds)
                .stream()
                .collect(Collectors.toMap(ParkingLotRealtime::getPkltCd, parkingLotRealtime ->
                        parkingLotRealtime));
    }

    @Transactional(readOnly = true)
    public ParkingLotDetailProjection findDetailById(Long id) {
        return parkingLotRepository.findDetailById(id)
                .orElseThrow(() -> new ChasewarException(NotFoundErrorCode.NOT_FOUND_PARKING_LOT));
    }
}

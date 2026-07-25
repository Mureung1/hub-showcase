package com.chasewar.parking.service;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.NotFoundErrorCode;
import com.chasewar.global.infra.placesearch.PlaceSearchClient;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.dto.ParkingLotDetailResponse;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.repository.ParkingLotRealtimeRepository;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParkingLotService {

    private static final double SEARCH_MAX_RADIUS_METERS = 1_000.0;
    private static final int MAX_RESULTS_COUNT = 10;

    private final PlaceSearchClient placeSearchClient;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotRealtimeRepository parkingLotRealtimeRepository;

    @Transactional(readOnly = true)
    public List<ParkingLotSearchResponse> search(String destination) {
        Coordinates destinationCoordinates = placeSearchClient.searchByKeyword(destination)
                .orElseThrow(() -> new ChasewarException(NotFoundErrorCode.NOT_FOUND_DESTINATION));

        return findNearbyParkingLots(destinationCoordinates);
    }

    @Transactional(readOnly = true)
    public ParkingLotDetailResponse getDetail(Long id) {
        ParkingLotDetailProjection projection = parkingLotRepository.findDetailById(id)
                .orElseThrow(() -> new ChasewarException(NotFoundErrorCode.NOT_FOUND_PARKING_LOT));

        return ParkingLotDetailResponse.from(projection);
    }

    private List<ParkingLotSearchResponse> findNearbyParkingLots(Coordinates destinationCoordinates) {
        List<ParkingLot> parkingLots = parkingLotRepository.findByCoordinatesLatitudeIsNotNull()
                .stream()
                .filter(parkingLot -> destinationCoordinates.distanceTo(parkingLot.getCoordinates())
                        <= SEARCH_MAX_RADIUS_METERS)
                .sorted(Comparator.comparingDouble(
                        parkingLot -> destinationCoordinates.distanceTo(parkingLot.getCoordinates())))
                .limit(MAX_RESULTS_COUNT)
                .toList();

        Map<String, ParkingLotRealtime> realtimeByPkltCd = findRealtimeByPkltCd(parkingLots);

        return parkingLots.stream()
                .map(parkingLot -> ParkingLotSearchResponse.from(
                        parkingLot,
                        destinationCoordinates.distanceTo(parkingLot.getCoordinates()),
                        realtimeByPkltCd.get(parkingLot.getPkltCd())))
                .toList();
    }

    private Map<String, ParkingLotRealtime> findRealtimeByPkltCd(List<ParkingLot> parkingLots) {
        List<String> pkltCds = parkingLots.stream()
                .map(ParkingLot::getPkltCd)
                .toList();

        return parkingLotRealtimeRepository.findByPkltCdIn(pkltCds)
                .stream()
                .collect(Collectors.toMap(ParkingLotRealtime::getPkltCd, realtime -> realtime));
    }
}

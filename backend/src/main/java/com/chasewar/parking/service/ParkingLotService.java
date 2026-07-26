package com.chasewar.parking.service;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.NotFoundErrorCode;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.domain.vo.WalkingRoute;
import com.chasewar.parking.dto.ParkingLotDetailResponse;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.infra.walkingroute.WalkingRouteClient;
import com.chasewar.parking.repository.ParkingLotRealtimeRepository;
import com.chasewar.parking.repository.ParkingLotRepository;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParkingLotService {

    private static final double SEARCH_MAX_RADIUS_METERS = 1_000.0;
    private static final int MAX_RESULTS_COUNT = 10;

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotRealtimeRepository parkingLotRealtimeRepository;
    private final WalkingRouteClient walkingRouteClient;
    private final Executor walkingRouteExecutor;

    @Transactional(readOnly = true)
    public List<ParkingLotSearchResponse> search(Coordinates destinationCoordinates) {
        return findNearbyParkingLots(destinationCoordinates);
    }

    @Transactional(readOnly = true)
    public ParkingLotDetailResponse getDetail(Long id, Coordinates destinationCoordinates) {
        ParkingLotDetailProjection projection = parkingLotRepository.findDetailById(id)
                .orElseThrow(() -> new ChasewarException(NotFoundErrorCode.NOT_FOUND_PARKING_LOT));
        WalkingRoute walkingRoute = findWalkingRoute(projection, destinationCoordinates);

        return ParkingLotDetailResponse.from(projection, destinationCoordinates, walkingRoute);
    }

    private List<ParkingLotSearchResponse> findNearbyParkingLots(Coordinates destinationCoordinates) {
        List<ParkingLot> parkingLots = findWithinRadius(destinationCoordinates);
        Map<String, ParkingLotRealtime> realtimeByPkltCd = findRealtimeByPkltCd(parkingLots);
        Map<Long, WalkingRoute> walkingRouteById = findWalkingRoutes(parkingLots, destinationCoordinates);

        return parkingLots.stream()
                .map(parkingLot -> ParkingLotSearchResponse.from(
                        parkingLot,
                        destinationCoordinates.distanceTo(parkingLot.getCoordinates()),
                        walkingRouteById.get(parkingLot.getId()),
                        realtimeByPkltCd.get(parkingLot.getPkltCd())
                ))
                .sorted(Comparator.comparingInt(ParkingLotSearchResponse::distance))
                .limit(MAX_RESULTS_COUNT)
                .toList();
    }

    private List<ParkingLot> findWithinRadius(Coordinates destinationCoordinates) {
        return parkingLotRepository.findByCoordinatesLatitudeIsNotNull()
                .stream()
                .filter(parkingLot -> destinationCoordinates.distanceTo(parkingLot.getCoordinates()) <=
                        SEARCH_MAX_RADIUS_METERS
                )
                .toList();
    }

    private Map<String, ParkingLotRealtime> findRealtimeByPkltCd(List<ParkingLot> parkingLots) {
        List<String> pkltCds = parkingLots.stream()
                .map(ParkingLot::getPkltCd)
                .toList();

        return parkingLotRealtimeRepository.findByPkltCdIn(pkltCds)
                .stream()
                .collect(Collectors.toMap(ParkingLotRealtime::getPkltCd, parkingLotRealtime -> parkingLotRealtime));
    }

    private Map<Long, WalkingRoute> findWalkingRoutes(
            List<ParkingLot> parkingLots,
            Coordinates destinationCoordinates
    ) {
        Map<Long, CompletableFuture<Optional<WalkingRoute>>> futures = parkingLots.stream()
                .collect(Collectors.toMap(
                        ParkingLot::getId,
                        parkingLot -> requestWalkingRoute(parkingLot, destinationCoordinates)
                ));

        Map<Long, WalkingRoute> walkingRouteById = new HashMap<>();
        futures.forEach((parkingLotId, future) ->
                future.join().ifPresent(walkingRoute -> walkingRouteById.put(parkingLotId,
                        walkingRoute)));

        return walkingRouteById;
    }

    private CompletableFuture<Optional<WalkingRoute>> requestWalkingRoute(
            ParkingLot parkingLot,
            Coordinates destinationCoordinates
    ) {
        return CompletableFuture.supplyAsync(
                () -> walkingRouteClient.findRoute(parkingLot.getCoordinates(), destinationCoordinates),
                walkingRouteExecutor
        );
    }

    private WalkingRoute findWalkingRoute(
            ParkingLotDetailProjection projection,
            Coordinates destinationCoordinates
    ) {
        if (destinationCoordinates == null || projection.coordinates() == null) {
            return null;
        }

        return walkingRouteClient.findRoute(projection.coordinates(), destinationCoordinates)
                .orElse(null);
    }
}

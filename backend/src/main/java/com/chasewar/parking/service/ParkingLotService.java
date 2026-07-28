package com.chasewar.parking.service;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.domain.vo.WalkingRoute;
import com.chasewar.parking.dto.ParkingLotDetailResponse;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.infra.walkingroute.WalkingRouteClient;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ParkingLotService {

    private static final int MAX_RESULTS_COUNT = 10;

    private final ParkingLotQueryService parkingLotQueryService;
    private final WalkingRouteClient walkingRouteClient;

    public List<ParkingLotSearchResponse> search(Coordinates destinationCoordinates) {
        List<ParkingLot> parkingLots = parkingLotQueryService.findWithinRadius(destinationCoordinates);
        Map<String, ParkingLotRealtime> realtimeByPkltCd = parkingLotQueryService.findRealtimeByPkltCd(parkingLots);
        Map<Long, WalkingRoute> walkingRouteById = walkingRouteClient.findRoutes(toOriginById(parkingLots),
                destinationCoordinates);

        return toParkingLotSearchResponse(parkingLots, destinationCoordinates, walkingRouteById, realtimeByPkltCd);
    }

    public ParkingLotDetailResponse getDetail(Long id, Coordinates destinationCoordinates) {
        ParkingLotDetailProjection projection = parkingLotQueryService.findDetailById(id);
        WalkingRoute walkingRoute = findWalkingRoute(projection, destinationCoordinates);

        return ParkingLotDetailResponse.from(projection, destinationCoordinates, walkingRoute);
    }

    private Map<Long, Coordinates> toOriginById(List<ParkingLot> parkingLots) {
        return parkingLots.stream()
                .collect(Collectors.toMap(ParkingLot::getId, ParkingLot::getCoordinates));
    }

    private List<ParkingLotSearchResponse> toParkingLotSearchResponse(
            List<ParkingLot> parkingLots,
            Coordinates destinationCoordinates,
            Map<Long, WalkingRoute> walkingRouteById,
            Map<String, ParkingLotRealtime> realtimeByPkltCd
    ) {
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

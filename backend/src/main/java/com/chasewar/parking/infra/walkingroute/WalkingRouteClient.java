package com.chasewar.parking.infra.walkingroute;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.WalkingRoute;
import java.util.Map;
import java.util.Optional;

public interface WalkingRouteClient {

    Optional<WalkingRoute> findRoute(Coordinates origin, Coordinates destination);

    Map<Long, WalkingRoute> findRoutes(Map<Long, Coordinates> originById, Coordinates destination);
}

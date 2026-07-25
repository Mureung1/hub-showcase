package com.chasewar.global.infra.geocoding;

import com.chasewar.global.domain.vo.Coordinates;
import java.util.Optional;

public interface GeocodingClient {

    Optional<Coordinates> geocode(String address);
}

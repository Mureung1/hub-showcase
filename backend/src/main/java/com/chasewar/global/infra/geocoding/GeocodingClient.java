package com.chasewar.global.infra.geocoding;

import com.chasewar.parking.domain.vo.Coordinates;
import java.util.Optional;

public interface GeocodingClient {

    Optional<Coordinates> geocode(String address);
}

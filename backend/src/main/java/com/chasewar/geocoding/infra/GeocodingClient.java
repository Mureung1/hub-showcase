package com.chasewar.geocoding.infra;

import com.chasewar.parking.domain.vo.Coordinates;
import java.util.Optional;

public interface GeocodingClient {

    Optional<Coordinates> geocode(String address);
}

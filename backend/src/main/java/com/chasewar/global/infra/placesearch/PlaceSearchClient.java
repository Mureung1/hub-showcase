package com.chasewar.global.infra.placesearch;

import com.chasewar.global.domain.vo.Coordinates;
import java.util.Optional;

public interface PlaceSearchClient {

    Optional<Coordinates> searchByKeyword(String keyword);
}

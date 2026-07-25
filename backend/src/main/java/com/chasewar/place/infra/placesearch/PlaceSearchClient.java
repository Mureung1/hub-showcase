package com.chasewar.place.infra.placesearch;

import com.chasewar.place.domain.Place;
import java.util.List;

public interface PlaceSearchClient {

    List<Place> searchByKeyword(String keyword);
}

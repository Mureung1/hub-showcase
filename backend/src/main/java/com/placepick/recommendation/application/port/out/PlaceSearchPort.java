package com.placepick.recommendation.application.port.out;

public interface PlaceSearchPort {

    PlaceSearchResult searchPlaces(PlaceSearchQuery query);
}

package com.chasewar.place.service;

import com.chasewar.place.infra.placesearch.PlaceSearchClient;
import com.chasewar.place.dto.PlaceResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlaceService {

    private final PlaceSearchClient placeSearchClient;

    public List<PlaceResponse> search(String keyword) {
        return placeSearchClient.searchByKeyword(keyword)
                .stream()
                .map(PlaceResponse::from)
                .toList();
    }
}

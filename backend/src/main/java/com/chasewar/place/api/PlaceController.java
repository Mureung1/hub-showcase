package com.chasewar.place.api;

import com.chasewar.place.dto.PlaceResponse;
import com.chasewar.place.dto.PlaceSearchRequest;
import com.chasewar.place.service.PlaceService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    @GetMapping
    public List<PlaceResponse> search(
            @Valid @ModelAttribute PlaceSearchRequest request
    ) {
        return placeService.search(request.keyword());
    }
}

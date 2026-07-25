package com.chasewar.parking.api;

import com.chasewar.parking.dto.ParkingLotDetailResponse;
import com.chasewar.parking.dto.ParkingLotSearchRequest;
import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.service.ParkingLotService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/parking-lots")
@RequiredArgsConstructor
public class ParkingLotController {

    private final ParkingLotService parkingLotService;

    @GetMapping
    public List<ParkingLotSearchResponse> search(
            @Valid @ModelAttribute ParkingLotSearchRequest request
    ) {
        return parkingLotService.search(request.toCoordinates());
    }

    @GetMapping("/{id}")
    public ParkingLotDetailResponse getDetail(@PathVariable Long id) {
        return parkingLotService.getDetail(id);
    }
}

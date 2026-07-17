package com.chasewar.parking.api;

import com.chasewar.parking.dto.ParkingLotSearchResponse;
import com.chasewar.parking.service.ParkingLotSearchService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/parking-lots")
@RequiredArgsConstructor
public class ParkingLotController {

    private final ParkingLotSearchService parkingLotSearchService;

    @GetMapping
    public List<ParkingLotSearchResponse> search(@RequestParam String destination) {
        return parkingLotSearchService.search(destination);
    }
}

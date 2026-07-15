package com.chasewar.parking.admin.api;

import com.chasewar.parking.service.ParkingLotLoadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/parking-lots")
@RequiredArgsConstructor
public class ParkingLotAdminController {

    private final ParkingLotLoadService parkingLotLoadService;

    @PostMapping("/seoul")
    public ResponseEntity<Void> loadSeoulParkingLots() {
        parkingLotLoadService.load();
        return ResponseEntity.ok().build();
    }
}

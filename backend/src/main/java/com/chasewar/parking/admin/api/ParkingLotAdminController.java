package com.chasewar.parking.admin.api;

import com.chasewar.parking.service.ParkingLotGeocodingService;
import com.chasewar.parking.service.ParkingLotLoadService;
import com.chasewar.parking.service.ParkingLotRealtimeLoadService;
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
    private final ParkingLotGeocodingService parkingLotGeocodingService;
    private final ParkingLotRealtimeLoadService parkingLotRealtimeLoadService;

    @PostMapping("/seoul")
    public ResponseEntity<Void> loadSeoulParkingLots() {
        parkingLotLoadService.load();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/geocode")
    public ResponseEntity<Void> geocodeParkingLots() {
        parkingLotGeocodingService.geocode();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/realtime")
    public ResponseEntity<Void> loadParkingLotRealtime() {
        parkingLotRealtimeLoadService.load();
        return ResponseEntity.ok().build();
    }
}

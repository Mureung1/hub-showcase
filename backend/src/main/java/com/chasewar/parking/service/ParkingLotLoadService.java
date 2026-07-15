package com.chasewar.parking.service;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.dto.SeoulParkingLotResponse;
import com.chasewar.parking.infra.SeoulParkingLotClient;
import com.chasewar.parking.repository.ParkingLotJdbcRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParkingLotLoadService {

    private static final int PAGE_SIZE = 1000;

    private final SeoulParkingLotClient seoulParkingLotClient;
    private final ParkingLotJdbcRepository parkingLotJdbcRepository;

    @Transactional
    public void load() {
        int totalCount = seoulParkingLotClient
                .fetchPage(1, PAGE_SIZE)
                .getParkInfo()
                .listTotalCount();

        for (int start = 1; start <= totalCount; start += PAGE_SIZE) {
            int end = start + PAGE_SIZE - 1;

            List<ParkingLot> parkingLots = seoulParkingLotClient
                    .fetchPage(start, end)
                    .getParkInfo()
                    .rows()
                    .stream()
                    .map(SeoulParkingLotResponse.GetParkInfo.Row::toParkingLot)
                    .toList();

            parkingLotJdbcRepository.upsertAll(parkingLots);
        }
    }
}

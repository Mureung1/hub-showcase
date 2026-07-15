package com.chasewar.parking.service;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.dto.SeoulParkingLotResponse;
import com.chasewar.parking.infra.SeoulParkingLotClient;
import com.chasewar.parking.repository.ParkingLotJdbcRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingLotLoadService {

    private static final int PAGE_SIZE = 1000;
    private static final String DAILY_CRON_4AM = "0 0 4 * * *";

    private final SeoulParkingLotClient seoulParkingLotClient;
    private final ParkingLotJdbcRepository parkingLotJdbcRepository;

    @Scheduled(cron = DAILY_CRON_4AM)
    @Transactional
    public void load() {
        int totalCount = seoulParkingLotClient
                .fetchPage(1, PAGE_SIZE)
                .getParkInfo()
                .listTotalCount();
        log.info("[주차장 적재] 전체 {}건 예상", totalCount);

        for (int start = 1; start <= totalCount; start += PAGE_SIZE) {
            int end = start + PAGE_SIZE - 1;

            List<ParkingLot> parkingLots = seoulParkingLotClient
                    .fetchPage(start, end)
                    .getParkInfo()
                    .rows()
                    .stream()
                    .map(SeoulParkingLotResponse.GetParkInfo.Row::toParkingLot)
                    .toList();
            log.info("[주차장 적재] page {}~{}: 조회 {}건", start, end, parkingLots.size());

            parkingLotJdbcRepository.upsertAll(parkingLots);
        }
    }
}

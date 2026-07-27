package com.chasewar.parking.service;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.infra.opendata.SeoulParkingLotClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse.GetParkInfo.Row;
import com.chasewar.parking.repository.ParkingLotJdbcRepository;
import java.util.ArrayList;
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

    private static final String DAILY_CRON_4AM = "0 0 4 * * *";
    private static final int PAGE_SIZE = 1000;

    private final SeoulParkingLotClient seoulParkingLotClient;
    private final ParkingLotJdbcRepository parkingLotJdbcRepository;

    @Scheduled(cron = DAILY_CRON_4AM)
    @Transactional
    public void load() {
        int totalCount = seoulParkingLotClient.fetchPage(1, PAGE_SIZE)
                .getParkInfo()
                .listTotalCount();
        log.info("[주차장 적재] 전체 {}행 예상", totalCount);

        List<Row> rows = new ArrayList<>();
        for (int start = 1; start <= totalCount; start += PAGE_SIZE) {
            int end = start + PAGE_SIZE - 1;
            rows.addAll(seoulParkingLotClient.fetchPage(start, end).getParkInfo().rows());
        }

        List<ParkingLot> parkingLots = Row.toParkingLots(rows);
        log.info("[주차장 적재] {}행 -> {}개 주차장 집계", rows.size(), parkingLots.size());

        parkingLotJdbcRepository.upsertAll(parkingLots);
    }
}

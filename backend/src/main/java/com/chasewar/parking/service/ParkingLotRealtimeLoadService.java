package com.chasewar.parking.service;

import com.chasewar.parking.domain.ParkingLotRealtime;
import com.chasewar.parking.infra.opendata.SeoulParkingLotRealtimeClient;
import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse.GetParkingInfo.Row;
import com.chasewar.parking.repository.ParkingLotRealtimeJdbcRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingLotRealtimeLoadService {

    private static final String REALTIME_CRON_2MIN = "0 */2 * * * *";
    private static final int FETCH_START = 1;
    private static final int FETCH_END = 1000;

    private final SeoulParkingLotRealtimeClient seoulParkingLotRealtimeClient;
    private final ParkingLotRealtimeJdbcRepository parkingLotRealtimeJdbcRepository;

    @Scheduled(cron = REALTIME_CRON_2MIN)
    @Transactional
    public void load() {
        List<ParkingLotRealtime> realtimes = seoulParkingLotRealtimeClient.fetchPage(FETCH_START, FETCH_END)
                .getParkingInfo()
                .rows()
                .stream()
                .map(Row::toParkingLotRealtime)
                .toList();
        log.info("[서울 실시간 주차장 데이터 적재] {}건 조회·매핑", realtimes.size());

        parkingLotRealtimeJdbcRepository.upsertAll(realtimes);
    }
}

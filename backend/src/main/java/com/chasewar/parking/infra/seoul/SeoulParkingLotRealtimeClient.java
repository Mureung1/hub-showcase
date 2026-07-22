package com.chasewar.parking.infra.seoul;

import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotRealtimeResponse;

public interface SeoulParkingLotRealtimeClient {

    SeoulParkingLotRealtimeResponse fetchPage(int startIndex, int endIndex);
}

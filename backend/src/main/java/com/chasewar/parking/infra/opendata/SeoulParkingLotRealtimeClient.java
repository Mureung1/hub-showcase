package com.chasewar.parking.infra.opendata;

import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotRealtimeResponse;

public interface SeoulParkingLotRealtimeClient {

    SeoulParkingLotRealtimeResponse fetchPage(int startIndex, int endIndex);
}

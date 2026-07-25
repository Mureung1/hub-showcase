package com.chasewar.parking.infra.opendata;

import com.chasewar.parking.infra.opendata.seoul.dto.SeoulParkingLotResponse;

public interface SeoulParkingLotClient {

    SeoulParkingLotResponse fetchPage(int startIndex, int endIndex);
}

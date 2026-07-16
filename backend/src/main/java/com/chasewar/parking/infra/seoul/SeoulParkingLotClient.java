package com.chasewar.parking.infra.seoul;

import com.chasewar.parking.infra.seoul.dto.SeoulParkingLotResponse;

public interface SeoulParkingLotClient {

    SeoulParkingLotResponse fetchPage(int startIndex, int endIndex);
}

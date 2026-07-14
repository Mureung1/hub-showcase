package com.chasewar.parking.infra;

import com.chasewar.parking.dto.SeoulParkingLotResponse;

public interface SeoulParkingLotClient {

    SeoulParkingLotResponse fetchPage(int startIndex, int endIndex);
}

package com.chasewar.parking.domain.vo;

import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ParkingKind {

    OUTDOOR("NW", "노외 주차장"),
    ON_STREET("NS", "노상 주차장"),
    UNKNOWN("", "정보 없음");

    private final String code;
    private final String description;

    public static ParkingKind fromCode(String code) {
        return Arrays.stream(values())
                .filter(parkingKind -> parkingKind.code.equals(code))
                .findFirst()
                .orElse(UNKNOWN);
    }
}

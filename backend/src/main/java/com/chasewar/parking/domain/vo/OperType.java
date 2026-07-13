package com.chasewar.parking.domain.vo;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OperType {

    TIME_BASED("1", "시간제 주차장"),
    RESIDENT_PRIORITY("2", "거주자 우선 주차장"),
    TIME_AND_RESIDENT("3", "시간제 + 거주자 우선 주차장"),
    UNKNOWN("", "정보 없음");

    private final String code;
    private final String description;
}

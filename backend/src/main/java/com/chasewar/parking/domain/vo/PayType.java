package com.chasewar.parking.domain.vo;

import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PayType {

    PAID("Y", "유료"),
    FREE("N", "무료"),
    UNKNOWN("", "정보 없음");

    private final String code;
    private final String description;

    public static PayType fromCode(String code) {
        return Arrays.stream(values())
                .filter(payType -> payType.code.equals(code))
                .findFirst()
                .orElse((UNKNOWN));
    }
}

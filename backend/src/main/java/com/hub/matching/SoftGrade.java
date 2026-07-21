package com.hub.matching;

import java.math.BigDecimal;

/**
 * 서술형 판정은 연속값을 허용하지 않는다.
 * 같은 입력에 0.85 / 0.9 / 0.87 이 흔들리는 걸 막으려면 등급이어야 한다.
 */
public enum SoftGrade {
    NONE(BigDecimal.ZERO),
    INDIRECT(new BigDecimal("0.300")),
    PARTIAL(new BigDecimal("0.600")),
    MET(BigDecimal.ONE);

    private final BigDecimal value;

    SoftGrade(BigDecimal value) { this.value = value; }

    public BigDecimal value() { return value; }
}

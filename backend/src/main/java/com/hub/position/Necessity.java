package com.hub.position;

import java.math.BigDecimal;

public enum Necessity {
    REQUIRED(new BigDecimal("1.0")),
    PREFERRED(new BigDecimal("0.4"));

    private final BigDecimal base;

    Necessity(BigDecimal base) { this.base = base; }

    public BigDecimal base() { return base; }

    /** 필수 조건만 게이트 곱셈 대상 */
    public boolean isGated() { return this == REQUIRED; }
}

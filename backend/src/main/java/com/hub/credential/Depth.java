package com.hub.credential;

import java.math.BigDecimal;

/** 이력 관여 깊이. SKILL_USE 충족도의 곱 계수. */
public enum Depth {
    MENTIONED(new BigDecimal("0.3")),
    USED(new BigDecimal("0.7")),
    OWNED(BigDecimal.ONE);

    private final BigDecimal factor;

    Depth(BigDecimal factor) { this.factor = factor; }

    public BigDecimal factor() { return factor; }
}

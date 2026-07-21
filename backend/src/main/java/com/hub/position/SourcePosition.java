package com.hub.position;

import java.math.BigDecimal;

public enum SourcePosition {
    REQUIREMENTS_TOP(new BigDecimal("1.2")),
    REQUIREMENTS_BOTTOM(BigDecimal.ONE),
    UNKNOWN(BigDecimal.ONE);

    private final BigDecimal bonus;

    SourcePosition(BigDecimal bonus) { this.bonus = bonus; }

    public BigDecimal bonus() { return bonus; }
}

package com.tapha.hub.quote.presentation;

import jakarta.validation.constraints.NotNull;

public record CreateQuoteExposureRequest(
        @NotNull(message = "글귀를 확인해 주세요.") Long quoteId
) { }

package com.tapha.hub.quote.presentation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record QuoteTextRequest(
        @NotBlank(message = "글귀를 입력해 주세요.")
        @Size(max = 300, message = "글귀는 300자 이하여야 해요.")
        String text
) { }

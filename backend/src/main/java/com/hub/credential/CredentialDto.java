package com.hub.credential;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class CredentialDto {

    public record SaveRequest(
            @NotNull CredentialType type,
            @NotBlank String title,
            String detail,
            LocalDate startedOn,
            LocalDate endedOn
    ) {}

    public record Response(
            Long id,
            CredentialType type,
            String title,
            String detail,
            LocalDate startedOn,
            LocalDate endedOn,
            boolean ongoing
    ) {
        public static Response from(Credential c) {
            return new Response(c.getId(), c.getType(), c.getTitle(), c.getDetail(),
                    c.getStartedOn(), c.getEndedOn(), c.isOngoing());
        }
    }

    /** 사이드바의 "이력 완성도 78%" */
    public record CompletenessResponse(int percentage, java.util.List<String> missing) {}
}

package com.chasewar.place.dto;

import jakarta.validation.constraints.NotBlank;

public record PlaceSearchRequest(
        @NotBlank
        String keyword
) {
}

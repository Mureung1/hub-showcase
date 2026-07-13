package com.chasewar.parking.domain.vo;

import jakarta.persistence.Embeddable;

@Embeddable
public record Coordinates(
        Double latitude,
        Double longitude
) {
}

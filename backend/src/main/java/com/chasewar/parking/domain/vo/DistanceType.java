package com.chasewar.parking.domain.vo;

import lombok.Getter;

@Getter
public enum DistanceType {

    WALKING("도보"),
    STRAIGHT("직선");

    private final String description;

    DistanceType(String description) {
        this.description = description;
    }
}

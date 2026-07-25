package com.chasewar.place.domain;

import com.chasewar.global.domain.vo.Coordinates;

public record Place(
        String name,
        String address,
        Coordinates coordinates
) {
}

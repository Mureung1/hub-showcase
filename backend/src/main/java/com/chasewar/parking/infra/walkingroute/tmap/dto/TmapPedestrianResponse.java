package com.chasewar.parking.infra.walkingroute.tmap.dto;

import com.chasewar.parking.domain.vo.WalkingRoute;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Optional;

public record TmapPedestrianResponse(
        @JsonProperty("features") List<Feature> features
) {

    public Optional<WalkingRoute> toWalkingRoute() {
        if (features == null || features.isEmpty()) {
            return Optional.empty();
        }

        Feature.Properties properties = features.get(0).properties();
        if (properties == null || properties.totalDistance() == null || properties.totalTime() == null) {
            return Optional.empty();
        }

        return Optional.of(new WalkingRoute(properties.totalDistance(), properties.totalTime()));
    }

    public record Feature(
            @JsonProperty("properties") Properties properties
    ) {

        public record Properties(
                @JsonProperty("totalDistance") Integer totalDistance,
                @JsonProperty("totalTime") Integer totalTime
        ) {
        }
    }
}

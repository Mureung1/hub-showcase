package com.placepick.recommendation.application.candidate;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

public final class LocationMatcher {

    private static final Pattern ADMINISTRATIVE_SUFFIX = Pattern.compile(
        "(특별자치시|특별자치도|특별시|광역시|도|시|군|구|읍|면|동|리)$"
    );
    public boolean matches(String locationQuery, String address, String roadAddress) {
        List<String> requested = tokens(locationQuery);
        if (requested.isEmpty()) {
            return false;
        }
        List<String> addressTokens = tokens(address);
        List<String> roadAddressTokens = tokens(roadAddress);
        return requested.stream().allMatch(addressTokens::contains)
            || requested.stream().allMatch(roadAddressTokens::contains);
    }

    private List<String> tokens(String value) {
        String normalized = SearchTextNormalizer.comparison(value);
        if (normalized.isBlank()) {
            return List.of();
        }
        return Arrays.stream(normalized.split("[^\\p{L}\\p{N}]+"))
            .map(token -> ADMINISTRATIVE_SUFFIX.matcher(token).replaceFirst(""))
            .filter(token -> !token.isBlank())
            .toList();
    }
}

package com.punchman.devpulse.collector.alio;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;

public final class AlioFormEncoder {

    private AlioFormEncoder() {
    }

    public static String encode(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> entry.getValue() != null)
                .map(entry -> encodeComponent(entry.getKey()) + "=" + encodeComponent(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encodeComponent(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

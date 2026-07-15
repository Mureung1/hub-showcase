package com.placepick.recommendation.application.candidate;

import com.placepick.shared.text.SafeHtmlEntityDecoder;
import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SearchTextNormalizer {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern WHITESPACE = Pattern.compile(
        "\\s+",
        Pattern.UNICODE_CHARACTER_CLASS
    );

    private SearchTextNormalizer() {
    }

    public static String display(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = SafeHtmlEntityDecoder.unescape(value);
        normalized = HTML_TAG.matcher(normalized).replaceAll(" ");
        return WHITESPACE.matcher(normalized).replaceAll(" ").trim();
    }

    public static String comparison(String value) {
        return Normalizer.normalize(display(value), Normalizer.Form.NFKC)
            .toLowerCase(Locale.ROOT);
    }
}

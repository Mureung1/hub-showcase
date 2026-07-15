package com.placepick.infrastructure.external.naver;

import com.placepick.shared.text.SafeHtmlEntityDecoder;
import java.util.regex.Pattern;

final class NaverTextSanitizer {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern WHITESPACE = Pattern.compile(
        "\\s+",
        Pattern.UNICODE_CHARACTER_CLASS
    );

    private NaverTextSanitizer() {
    }

    static String plainText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String unescaped = SafeHtmlEntityDecoder.unescape(value);
        String withoutTags = HTML_TAG.matcher(unescaped).replaceAll(" ");
        return WHITESPACE.matcher(withoutTags).replaceAll(" ").trim();
    }
}

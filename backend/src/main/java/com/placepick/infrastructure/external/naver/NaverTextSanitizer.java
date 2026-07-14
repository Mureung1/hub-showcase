package com.placepick.infrastructure.external.naver;

import java.util.regex.Pattern;
import org.springframework.web.util.HtmlUtils;

final class NaverTextSanitizer {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private NaverTextSanitizer() {
    }

    static String plainText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String unescaped = HtmlUtils.htmlUnescape(value);
        String withoutTags = HTML_TAG.matcher(unescaped).replaceAll(" ");
        return WHITESPACE.matcher(withoutTags).replaceAll(" ").strip();
    }
}

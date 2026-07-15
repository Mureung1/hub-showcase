package com.placepick.shared.text;

import java.util.Objects;
import org.springframework.web.util.HtmlUtils;

/**
 * Decodes one bounded HTML 4 character reference at a time.
 *
 * <p>Spring's decoder intentionally leaves unknown and malformed references unchanged, but a
 * syntactically bounded negative numeric reference can make {@link HtmlUtils#htmlUnescape(String)}
 * throw. Provider text is untrusted, so this wrapper preserves only that offending reference and
 * continues decoding the rest of the value.</p>
 */
public final class SafeHtmlEntityDecoder {

    private static final int MAX_REFERENCE_DISTANCE = 9;

    private SafeHtmlEntityDecoder() {
    }

    public static String unescape(String input) {
        Objects.requireNonNull(input, "input");
        if (input.indexOf('&') < 0) {
            return input;
        }

        StringBuilder decoded = new StringBuilder(input.length());
        int cursor = 0;
        while (cursor < input.length()) {
            int referenceStart = input.indexOf('&', cursor);
            if (referenceStart < 0) {
                decoded.append(input, cursor, input.length());
                break;
            }
            decoded.append(input, cursor, referenceStart);

            int referenceEnd = boundedSemicolon(input, referenceStart);
            if (referenceEnd < 0) {
                decoded.append('&');
                cursor = referenceStart + 1;
                continue;
            }

            String reference = input.substring(referenceStart, referenceEnd + 1);
            decoded.append(decodeReferenceOrPreserve(reference));
            cursor = referenceEnd + 1;
        }
        return decoded.toString();
    }

    private static int boundedSemicolon(String input, int referenceStart) {
        int lastPossibleEnd = Math.min(
            input.length() - 1,
            referenceStart + MAX_REFERENCE_DISTANCE
        );
        for (int index = referenceStart + 1; index <= lastPossibleEnd; index++) {
            if (input.charAt(index) == ';') {
                return index;
            }
        }
        return -1;
    }

    private static String decodeReferenceOrPreserve(String reference) {
        try {
            return HtmlUtils.htmlUnescape(reference);
        } catch (IllegalArgumentException ignored) {
            return reference;
        }
    }
}

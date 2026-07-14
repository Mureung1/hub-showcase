package com.placepick.recommendation.condition.application.port.out;

import java.text.Normalizer;
import java.util.Objects;
import java.util.regex.Pattern;

public record ExtractionCommand(String requestText, String safetyIdentifier) {

    private static final Pattern SAFETY_IDENTIFIER = Pattern.compile("[A-Za-z0-9_-]{16,128}");

    public ExtractionCommand {
        requestText = normalize(Objects.requireNonNull(requestText, "requestText"));
        int length = requestText.codePointCount(0, requestText.length());
        if (requestText.isBlank() || length > 1_000 || containsUnsafeControl(requestText)) {
            throw new IllegalArgumentException(
                "Request text must contain between 1 and 1000 safe characters."
            );
        }
        if (safetyIdentifier == null || !SAFETY_IDENTIFIER.matcher(safetyIdentifier).matches()) {
            throw new IllegalArgumentException("Safety identifier has an invalid format.");
        }
    }

    @Override
    public String toString() {
        return "ExtractionCommand[requestText=<redacted>, safetyIdentifier=<redacted>]";
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC).strip();
    }

    private static boolean containsUnsafeControl(String value) {
        return value.codePoints().anyMatch(character ->
            Character.isISOControl(character) && character != '\n' && character != '\r' &&
                character != '\t'
        );
    }
}

package com.tapha.hub.book.application;

import java.util.Locale;

public record BookMetadata(
        String provider,
        String providerId,
        String title,
        String author,
        String isbn10,
        String isbn13,
        String publishedDate,
        Integer pageCount
) {

    public String normalizedIsbn10() {
        String value = compact(isbn10).toUpperCase(Locale.ROOT);
        return isValidIsbn10(value) ? value : null;
    }

    public String normalizedIsbn13() {
        String value = compact(isbn13);
        if (isValidIsbn13(value)) {
            return value;
        }

        String value10 = normalizedIsbn10();
        if (value10 == null) {
            return null;
        }

        String body = "978" + value10.substring(0, 9);
        int checksum = 0;
        for (int index = 0; index < body.length(); index++) {
            checksum += (body.charAt(index) - '0') * (index % 2 == 0 ? 1 : 3);
        }
        return body + ((10 - checksum % 10) % 10);
    }

    public String editionKey() {
        String canonicalIsbn13 = normalizedIsbn13();
        return canonicalIsbn13 == null
                ? provider + ":" + providerId
                : "ISBN13:" + canonicalIsbn13;
    }

    private static String compact(String value) {
        return value == null ? "" : value.replaceAll("[-\\s]", "");
    }

    private static boolean isValidIsbn10(String value) {
        if (!value.matches("\\d{9}[\\dX]")) {
            return false;
        }

        int sum = 0;
        for (int index = 0; index < 10; index++) {
            int digit = value.charAt(index) == 'X' ? 10 : value.charAt(index) - '0';
            sum += (10 - index) * digit;
        }
        return sum % 11 == 0;
    }

    private static boolean isValidIsbn13(String value) {
        if (!value.matches("\\d{13}")) {
            return false;
        }

        int sum = 0;
        for (int index = 0; index < 13; index++) {
            sum += (value.charAt(index) - '0') * (index % 2 == 0 ? 1 : 3);
        }
        return sum % 10 == 0;
    }
}

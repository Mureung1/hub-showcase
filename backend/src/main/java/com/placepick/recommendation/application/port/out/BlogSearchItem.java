package com.placepick.recommendation.application.port.out;

import java.util.Objects;

public record BlogSearchItem(
    String title,
    String link,
    String summary,
    String authorName,
    String authorLink,
    String publishedDate
) {

    public BlogSearchItem {
        title = Objects.requireNonNull(title, "title");
        link = Objects.requireNonNull(link, "link");
        summary = Objects.requireNonNull(summary, "summary");
        authorName = Objects.requireNonNull(authorName, "authorName");
        authorLink = Objects.requireNonNull(authorLink, "authorLink");
        publishedDate = Objects.requireNonNull(publishedDate, "publishedDate");
    }
}

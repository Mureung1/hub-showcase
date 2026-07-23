package com.tapha.hub.book.presentation;

import java.util.List;

public record BookSearchResponse(List<BookSearchResult> books) {
}

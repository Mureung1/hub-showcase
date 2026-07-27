package com.tapha.hub.book.presentation;

import java.util.List;

public record BookshelfResponse(
        List<BookResponse> reading,
        List<BookResponse> completed,
        List<BookResponse> archived
) {
}

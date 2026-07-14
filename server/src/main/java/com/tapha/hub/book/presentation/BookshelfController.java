package com.tapha.hub.book.presentation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.book.application.BookService;
import com.tapha.hub.book.domain.BookStatus;

@RestController
@RequestMapping("/api/users/{userId}/books")
public class BookshelfController {

    private final BookService bookService;

    public BookshelfController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping
    public BookshelfResponse getBooks(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "READING") BookStatus status
    ) {
        return bookService.getBooks(userId, status);
    }
}

package com.tapha.hub.book.presentation;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.book.application.BookService;

@RestController
@RequestMapping("/api/bookshelf")
public class BookshelfController {

    private final BookService bookService;
    private final SessionAuth sessionAuth;

    public BookshelfController(BookService bookService, SessionAuth sessionAuth) {
        this.bookService = bookService;
        this.sessionAuth = sessionAuth;
    }

    @GetMapping
    public BookshelfResponse getBooks(HttpServletRequest request) {
        return bookService.getBooks(sessionAuth.requireUserId(request));
    }
}

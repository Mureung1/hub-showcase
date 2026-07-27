package com.tapha.hub.book.presentation;

import java.net.URI;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.book.application.BookService;
import com.tapha.hub.auth.application.SessionAuth;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;
    private final SessionAuth sessionAuth;

    public BookController(BookService bookService, SessionAuth sessionAuth) {
        this.bookService = bookService;
        this.sessionAuth = sessionAuth;
    }

    @PostMapping
    public ResponseEntity<BookResponse> create(
            @Valid @RequestBody CreateBookRequest request,
            HttpServletRequest servletRequest
    ) {
        BookResponse response = bookService.create(sessionAuth.requireUserId(servletRequest), request);
        return ResponseEntity.created(URI.create("/api/books/" + response.id())).body(response);
    }

    @GetMapping("/search")
    public BookSearchResponse search(@RequestParam String q) {
        return bookService.search(q);
    }

    @GetMapping("/{bookId}")
    public BookDetailResponse getBook(@PathVariable Long bookId, HttpServletRequest request) {
        return bookService.getBook(bookId, sessionAuth.requireUserId(request));
    }

    @PatchMapping("/{bookId}/status")
    public BookResponse updateStatus(
            @PathVariable Long bookId,
            @Valid @RequestBody UpdateBookStatusRequest request,
            HttpServletRequest servletRequest
    ) {
        return bookService.updateStatus(bookId, sessionAuth.requireUserId(servletRequest), request);
    }
}

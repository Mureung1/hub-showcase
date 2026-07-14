package com.tapha.hub.book.presentation;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.book.application.BookService;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @PostMapping
    public ResponseEntity<BookResponse> create(@Valid @RequestBody CreateBookRequest request) {
        BookResponse response = bookService.create(request);
        return ResponseEntity.created(URI.create("/api/books/" + response.id())).body(response);
    }

    @GetMapping("/{bookId}")
    public BookDetailResponse getBook(@PathVariable Long bookId, @RequestParam Long userId) {
        return bookService.getBook(bookId, userId);
    }
}

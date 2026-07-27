package com.tapha.hub.quote.presentation;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.quote.application.QuoteService;

@RestController
@RequestMapping("/api")
public class QuoteController {

    private final QuoteService quoteService;
    private final SessionAuth sessionAuth;

    public QuoteController(QuoteService quoteService, SessionAuth sessionAuth) {
        this.quoteService = quoteService;
        this.sessionAuth = sessionAuth;
    }

    @GetMapping("/quotes/random")
    public ResponseEntity<QuoteResponse> random(HttpServletRequest request) {
        QuoteResponse quote = quoteService.random(sessionAuth.requireUserId(request));
        return quote == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(quote);
    }

    @GetMapping("/books/{bookId}/quotes")
    public List<QuoteResponse> list(@PathVariable Long bookId, HttpServletRequest request) {
        return quoteService.list(bookId, sessionAuth.requireUserId(request));
    }

    @PostMapping("/books/{bookId}/quotes")
    public ResponseEntity<QuoteResponse> create(
            @PathVariable Long bookId,
            @Valid @RequestBody QuoteTextRequest body,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(201)
                .body(quoteService.create(bookId, sessionAuth.requireUserId(request), body.text()));
    }

    @PatchMapping("/quotes/{quoteId}")
    public QuoteResponse update(
            @PathVariable Long quoteId,
            @Valid @RequestBody QuoteTextRequest body,
            HttpServletRequest request
    ) {
        return quoteService.update(quoteId, sessionAuth.requireUserId(request), body.text());
    }

    @DeleteMapping("/quotes/{quoteId}")
    public ResponseEntity<Void> delete(@PathVariable Long quoteId, HttpServletRequest request) {
        quoteService.delete(quoteId, sessionAuth.requireUserId(request));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quote-exposures")
    public ResponseEntity<QuoteExposureResponse> expose(
            @Valid @RequestBody CreateQuoteExposureRequest body,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(201)
                .body(quoteService.expose(body.quoteId(), sessionAuth.requireUserId(request)));
    }

    @PostMapping("/quote-exposures/{exposureId}/open")
    public ResponseEntity<Void> open(@PathVariable Long exposureId, HttpServletRequest request) {
        quoteService.open(exposureId, sessionAuth.requireUserId(request));
        return ResponseEntity.noContent().build();
    }
}

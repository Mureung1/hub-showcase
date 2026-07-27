package com.tapha.hub.quote.application;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.common.application.ResourceNotFoundException;
import com.tapha.hub.quote.domain.Quote;
import com.tapha.hub.quote.domain.QuoteExposure;
import com.tapha.hub.quote.domain.QuoteExposureRepository;
import com.tapha.hub.quote.domain.QuoteRepository;
import com.tapha.hub.quote.presentation.QuoteExposureResponse;
import com.tapha.hub.quote.presentation.QuoteResponse;

@Service
public class QuoteService {

    private final BookRepository bookRepository;
    private final QuoteRepository quoteRepository;
    private final QuoteExposureRepository exposureRepository;

    public QuoteService(
            BookRepository bookRepository,
            QuoteRepository quoteRepository,
            QuoteExposureRepository exposureRepository
    ) {
        this.bookRepository = bookRepository;
        this.quoteRepository = quoteRepository;
        this.exposureRepository = exposureRepository;
    }

    @Transactional(readOnly = true)
    public QuoteResponse random(Long userId) {
        // ponytail: loads one user's eligible quotes; switch to indexed sampling when measured quote volume requires it.
        List<Quote> quotes = quoteRepository.findEligible(userId);
        return quotes.isEmpty()
                ? null
                : QuoteResponse.from(quotes.get(ThreadLocalRandom.current().nextInt(quotes.size())));
    }

    @Transactional(readOnly = true)
    public List<QuoteResponse> list(Long bookId, Long userId) {
        requireBook(bookId, userId);
        return quoteRepository.findByBookIdAndUserIdOrderByCreatedAtDescIdDesc(bookId, userId)
                .stream().map(QuoteResponse::from).toList();
    }

    @Transactional
    public QuoteResponse create(Long bookId, Long userId, String text) {
        requireBook(bookId, userId);
        return QuoteResponse.from(quoteRepository.save(new Quote(userId, bookId, text.trim(), Instant.now())));
    }

    @Transactional
    public QuoteResponse update(Long quoteId, Long userId, String text) {
        Quote quote = requireQuote(quoteId, userId);
        quote.update(text.trim(), Instant.now());
        return QuoteResponse.from(quote);
    }

    @Transactional
    public void delete(Long quoteId, Long userId) {
        quoteRepository.delete(requireQuote(quoteId, userId));
    }

    @Transactional
    public QuoteExposureResponse expose(Long quoteId, Long userId) {
        Quote quote = requireQuote(quoteId, userId);
        return new QuoteExposureResponse(
                exposureRepository.save(new QuoteExposure(userId, quote, Instant.now())).getId()
        );
    }

    @Transactional
    public void open(Long exposureId, Long userId) {
        requireExposure(exposureId, userId).open(Instant.now());
    }

    private Quote requireQuote(Long quoteId, Long userId) {
        return quoteRepository.findByIdAndUserId(quoteId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("글귀를 찾을 수 없어요."));
    }

    private QuoteExposure requireExposure(Long exposureId, Long userId) {
        return exposureRepository.findByIdAndUserId(exposureId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("글귀 노출 기록을 찾을 수 없어요."));
    }

    private void requireBook(Long bookId, Long userId) {
        bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
    }
}

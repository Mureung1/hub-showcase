package com.tapha.hub.book.application;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.book.domain.BookStatus;
import com.tapha.hub.book.presentation.BookResponse;
import com.tapha.hub.book.presentation.BookDetailResponse;
import com.tapha.hub.book.presentation.BookshelfResponse;
import com.tapha.hub.book.presentation.CreateBookRequest;
import com.tapha.hub.common.application.ResourceNotFoundException;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.reading.presentation.ReadingRecordSummary;
import com.tapha.hub.user.domain.UserRepository;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final ReadingRecordRepository readingRecordRepository;

    public BookService(BookRepository bookRepository, UserRepository userRepository, ReadingRecordRepository readingRecordRepository) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.readingRecordRepository = readingRecordRepository;
    }

    @Transactional
    public BookResponse create(CreateBookRequest request) {
        if (!userRepository.existsById(request.userId())) {
            throw new ResourceNotFoundException("사용자를 찾을 수 없어요.");
        }

        Book book = new Book(
                request.userId(),
                request.title().trim(),
                normalizeAuthor(request.author()),
                request.initialPage() == null ? 1 : request.initialPage(),
                Instant.now()
        );

        return BookResponse.from(bookRepository.save(book));
    }

    @Transactional(readOnly = true)
    public BookshelfResponse getBooks(Long userId, BookStatus status) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("사용자를 찾을 수 없어요.");
        }

        List<BookResponse> books = bookRepository
                .findByUserIdAndStatusOrderByCreatedAtDescIdDesc(userId, status)
                .stream()
                .map(book -> BookResponse.from(book,
                        readingRecordRepository.countByBookId(book.getId()),
                        readingRecordRepository.findTopByBookIdOrderByCreatedAtDescIdDesc(book.getId())
                                .map(ReadingRecordSummary::from).orElse(null)))
                .toList();

        return new BookshelfResponse(books);
    }

    @Transactional(readOnly = true)
    public BookDetailResponse getBook(Long bookId, Long userId) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));

        List<ReadingRecordSummary> records = readingRecordRepository.findByBookIdOrderByCreatedAtAscIdAsc(bookId)
                .stream().map(ReadingRecordSummary::from).toList();
        return BookDetailResponse.from(book, records);
    }

    private String normalizeAuthor(String author) {
        if (author == null || author.isBlank()) {
            return null;
        }
        return author.trim();
    }
}

package com.tapha.hub.book.application;

import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.book.domain.BookStatus;
import com.tapha.hub.book.presentation.BookResponse;
import com.tapha.hub.book.presentation.BookDetailResponse;
import com.tapha.hub.book.presentation.BookshelfResponse;
import com.tapha.hub.book.presentation.BookSearchResponse;
import com.tapha.hub.book.presentation.BookSearchResult;
import com.tapha.hub.book.presentation.CreateBookRequest;
import com.tapha.hub.book.presentation.UpdateBookStatusRequest;
import com.tapha.hub.common.application.InvalidRequestException;
import com.tapha.hub.common.application.ResourceNotFoundException;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.reading.presentation.ReadingRecordSummary;
import com.tapha.hub.user.domain.UserRepository;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final ReadingRecordRepository readingRecordRepository;
    private final BookMetadataClient bookMetadataClient;

    public BookService(
            BookRepository bookRepository,
            UserRepository userRepository,
            ReadingRecordRepository readingRecordRepository,
            BookMetadataClient bookMetadataClient
    ) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.readingRecordRepository = readingRecordRepository;
        this.bookMetadataClient = bookMetadataClient;
    }

    @Transactional
    public BookResponse create(Long userId, CreateBookRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("사용자를 찾을 수 없어요.");
        }

        BookMetadata metadata = bookMetadataClient.get(request.providerId());
        if (metadata.providerId().isBlank() || metadata.title().isBlank()) {
            throw new BookProviderException("선택한 책 정보를 확인할 수 없어요.");
        }
        String editionKey = metadata.editionKey();
        if (bookRepository.findByUserIdAndEditionKey(userId, editionKey).isPresent()) {
            throw new DuplicateBookException();
        }
        int initialPage = request.initialPage() == null ? 1 : request.initialPage();
        if (metadata.pageCount() != null && initialPage > metadata.pageCount()) {
            throw new InvalidRequestException("INVALID_PAGE_RANGE", "시작 페이지가 책의 전체 쪽수를 넘을 수 없어요.");
        }

        Book book = new Book(
                userId,
                metadata.title().trim(),
                normalizeAuthor(metadata.author()),
                initialPage,
                Instant.now(),
                metadata.provider(),
                metadata.providerId(),
                metadata.normalizedIsbn10(),
                metadata.normalizedIsbn13(),
                editionKey,
                metadata.pageCount()
        );

        try {
            return BookResponse.from(bookRepository.save(book));
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateBookException();
        }
    }

    @Transactional(readOnly = true)
    public BookSearchResponse search(String query) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isBlank() || normalizedQuery.length() > 100) {
            throw new InvalidRequestException("INVALID_BOOK_QUERY", "책 이름을 확인해 주세요.");
        }

        Map<String, BookSearchResult> uniqueBooks = new LinkedHashMap<>();
        for (BookMetadata book : bookMetadataClient.search(normalizedQuery)) {
            uniqueBooks.putIfAbsent(book.editionKey(), BookSearchResult.from(book));
        }
        return new BookSearchResponse(uniqueBooks.values().stream().toList());
    }

    @Transactional(readOnly = true)
    public BookshelfResponse getBooks(Long userId) {
        List<Book> books = bookRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId);
        List<Long> bookIds = books.stream().map(Book::getId).toList();
        // ponytail: scans one user's records; replace with a DB summary projection when measured shelf p95 or record volume requires it.
        Map<Long, List<com.tapha.hub.reading.domain.ReadingRecord>> recordsByBook = bookIds.isEmpty()
                ? Map.of()
                : readingRecordRepository.findByBookIdInOrderByCreatedAtAscIdAsc(bookIds).stream()
                        .collect(Collectors.groupingBy(
                                com.tapha.hub.reading.domain.ReadingRecord::getBookId,
                                LinkedHashMap::new,
                                Collectors.toList()
                        ));

        Map<BookStatus, List<BookResponse>> byStatus = books.stream()
                .map(book -> toBookResponse(book, recordsByBook.getOrDefault(book.getId(), List.of())))
                .collect(Collectors.groupingBy(
                        BookResponse::status,
                        () -> new EnumMap<>(BookStatus.class),
                        Collectors.toList()
                ));
        return new BookshelfResponse(
                byStatus.getOrDefault(BookStatus.READING, List.of()),
                byStatus.getOrDefault(BookStatus.COMPLETED, List.of()),
                byStatus.getOrDefault(BookStatus.ARCHIVED, List.of())
        );
    }

    @Transactional(readOnly = true)
    public BookDetailResponse getBook(Long bookId, Long userId) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));

        List<ReadingRecordSummary> records = readingRecordRepository.findByBookIdOrderByCreatedAtAscIdAsc(bookId)
                .stream().map(ReadingRecordSummary::from).toList();
        return BookDetailResponse.from(book, records);
    }

    @Transactional
    public BookResponse updateStatus(Long bookId, Long userId, UpdateBookStatusRequest request) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));

        String finalReview = normalizeFinalReview(request.finalReview());
        switch (request.status()) {
            case COMPLETED -> {
                require(book.getStatus() == BookStatus.READING,
                        "읽는 중인 책만 완독으로 옮길 수 있어요.");
                book.complete(finalReview, Instant.now());
            }
            case ARCHIVED -> {
                require(book.getStatus() == BookStatus.READING,
                        "읽는 중인 책만 보관할 수 있어요.");
                require(finalReview == null, "보관할 때는 완독 서평을 저장할 수 없어요.");
                book.archive();
            }
            case READING -> {
                require(book.getStatus() == BookStatus.ARCHIVED || book.getStatus() == BookStatus.COMPLETED,
                        "완독하거나 보관한 책만 다시 읽는 중으로 옮길 수 있어요.");
                require(finalReview == null, "읽는 중으로 옮길 때는 완독 서평을 저장할 수 없어요.");
                book.resume();
            }
        }

        return toBookResponse(book);
    }

    private BookResponse toBookResponse(Book book) {
        return BookResponse.from(book,
                readingRecordRepository.countByBookId(book.getId()),
                readingRecordRepository.findTopByBookIdOrderByCreatedAtDescIdDesc(book.getId())
                        .map(ReadingRecordSummary::from).orElse(null));
    }

    private BookResponse toBookResponse(
            Book book,
            List<com.tapha.hub.reading.domain.ReadingRecord> records
    ) {
        ReadingRecordSummary latest = records.isEmpty()
                ? null
                : ReadingRecordSummary.from(records.getLast());
        return BookResponse.from(book, records.size(), latest);
    }

    private String normalizeFinalReview(String finalReview) {
        return finalReview == null || finalReview.isBlank() ? null : finalReview.trim();
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new InvalidRequestException("INVALID_BOOK_STATUS", message);
        }
    }

    private String normalizeAuthor(String author) {
        if (author == null || author.isBlank()) {
            return null;
        }
        return author.trim();
    }
}

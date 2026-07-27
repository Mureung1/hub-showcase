package com.tapha.hub.reading.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.common.application.InvalidRequestException;
import com.tapha.hub.common.application.ResourceNotFoundException;
import com.tapha.hub.reading.domain.ReadingRecord;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.reading.presentation.CreateReadingRecordRequest;
import com.tapha.hub.reading.presentation.CreateReadingRecordResponse;
import com.tapha.hub.reading.presentation.DeleteReadingRecordResponse;
import com.tapha.hub.reading.presentation.ReadingActivityResponse;
import com.tapha.hub.reading.presentation.ReadingRecordSummary;
import com.tapha.hub.reading.presentation.UpdateReadingRecordRequest;
import com.tapha.hub.quote.domain.Quote;
import com.tapha.hub.quote.domain.QuoteExposure;
import com.tapha.hub.quote.domain.QuoteExposureRepository;
import com.tapha.hub.quote.domain.QuoteRepository;

@Service
public class ReadingRecordService {
    private static final ZoneId ACTIVITY_ZONE = ZoneId.of("Asia/Seoul");
    private static final long MAX_ACTIVITY_DAYS = 84;

    private final BookRepository bookRepository;
    private final ReadingRecordRepository recordRepository;
    private final QuoteRepository quoteRepository;
    private final QuoteExposureRepository exposureRepository;

    public ReadingRecordService(
            BookRepository bookRepository,
            ReadingRecordRepository recordRepository,
            QuoteRepository quoteRepository,
            QuoteExposureRepository exposureRepository
    ) {
        this.bookRepository = bookRepository;
        this.recordRepository = recordRepository;
        this.quoteRepository = quoteRepository;
        this.exposureRepository = exposureRepository;
    }

    @Transactional
    public CreateReadingRecordResponse create(Long bookId, Long userId, CreateReadingRecordRequest request) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
        int suggestedStart = getNextStartPage(bookId, book);
        int startPage = request.startPageOverride() == null ? suggestedStart : request.startPageOverride();
        if (request.endPage() < startPage) {
            throw new InvalidRequestException("끝난 페이지는 %d쪽보다 앞설 수 없어요.".formatted(startPage));
        }
        requireWithinBook(book, request.endPage());

        ReadingRecord saved = recordRepository.save(new ReadingRecord(
                bookId, userId, startPage, request.endPage(), normalizeImpression(request.impression()), request.readingDurationSeconds(), Instant.now()
        ));
        String quoteText = normalizeText(request.quoteText());
        if (quoteText != null) {
            quoteRepository.save(new Quote(userId, bookId, quoteText, Instant.now()));
        }
        if (request.quoteExposureId() != null) {
            QuoteExposure exposure = exposureRepository.findByIdAndUserId(request.quoteExposureId(), userId)
                    .filter(candidate -> candidate.getBookId().equals(bookId))
                    .orElseThrow(() -> new ResourceNotFoundException("글귀 노출 기록을 찾을 수 없어요."));
            exposure.complete(saved.getId());
        }
        return new CreateReadingRecordResponse(ReadingRecordSummary.from(saved), saved.getEndPage() + 1);
    }

    @Transactional
    public CreateReadingRecordResponse update(Long bookId, Long recordId, Long userId, UpdateReadingRecordRequest request) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
        ReadingRecord record = findOwnedRecord(bookId, recordId, userId);
        boolean isLatest = isLatestRecord(bookId, recordId);
        if (!isLatest && request.endPage() != record.getEndPage()) {
            throw new InvalidRequestException("INVALID_RECORD_ACTION", "과거 기록은 감상만 수정할 수 있어요.");
        }
        if (isLatest && request.endPage() < record.getStartPage()) {
            throw new InvalidRequestException("끝난 페이지는 %d쪽보다 앞설 수 없어요.".formatted(record.getStartPage()));
        }
        if (isLatest) {
            requireWithinBook(book, request.endPage());
        }

        record.update(isLatest ? request.endPage() : record.getEndPage(), normalizeImpression(request.impression()));
        return new CreateReadingRecordResponse(ReadingRecordSummary.from(record), record.getEndPage() + 1);
    }

    @Transactional
    public DeleteReadingRecordResponse delete(Long bookId, Long recordId, Long userId) {
        Book book = bookRepository.findByIdAndUserId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
        ReadingRecord record = findLatestRecord(bookId, recordId, userId);
        recordRepository.delete(record);
        recordRepository.flush();
        return new DeleteReadingRecordResponse(getNextStartPage(bookId, book));
    }

    @Transactional(readOnly = true)
    public ReadingActivityResponse getActivity(Long userId, LocalDate from, LocalDate to) {
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days < 1 || days > MAX_ACTIVITY_DAYS) {
            throw new InvalidRequestException(
                    "INVALID_DATE_RANGE",
                    "조회 기간은 시작일이 종료일보다 늦지 않은 최대 84일이어야 해요."
            );
        }

        Instant fromInstant = from.atStartOfDay(ACTIVITY_ZONE).toInstant();
        Instant toExclusive = to.plusDays(1).atStartOfDay(ACTIVITY_ZONE).toInstant();
        var countsByDate = recordRepository
                .findByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtBefore(userId, fromInstant, toExclusive)
                .stream()
                .collect(Collectors.groupingBy(
                        record -> record.getCreatedAt().atZone(ACTIVITY_ZONE).toLocalDate(),
                        TreeMap::new,
                        Collectors.counting()
                ));

        return new ReadingActivityResponse(
                from,
                to,
                countsByDate.entrySet().stream()
                        .map(entry -> new ReadingActivityResponse.Day(entry.getKey(), entry.getValue()))
                        .toList()
        );
    }

    private ReadingRecord findLatestRecord(Long bookId, Long recordId, Long userId) {
        ReadingRecord record = findOwnedRecord(bookId, recordId, userId);
        if (!isLatestRecord(bookId, recordId)) {
            throw new InvalidRequestException("INVALID_RECORD_ACTION", "가장 최근 기록만 수정하거나 삭제할 수 있어요.");
        }
        return record;
    }

    private ReadingRecord findOwnedRecord(Long bookId, Long recordId, Long userId) {
        return recordRepository.findByIdAndBookIdAndUserId(recordId, bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("기록을 찾을 수 없어요."));
    }

    private boolean isLatestRecord(Long bookId, Long recordId) {
        return recordRepository.findTopByBookIdOrderByCreatedAtDescIdDesc(bookId)
                .map(latest -> latest.getId().equals(recordId))
                .orElse(false);
    }

    private int getNextStartPage(Long bookId, Book book) {
        return recordRepository.findTopByBookIdOrderByCreatedAtDescIdDesc(bookId)
                .map(record -> record.getEndPage() + 1)
                .orElse(book.getInitialPage());
    }

    private String normalizeImpression(String impression) {
        return normalizeText(impression);
    }

    private String normalizeText(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }

    private void requireWithinBook(Book book, int endPage) {
        if (book.getPageCount() != null && endPage > book.getPageCount()) {
            throw new InvalidRequestException("INVALID_PAGE_RANGE", "끝난 페이지가 책의 전체 쪽수를 넘을 수 없어요.");
        }
    }
}

package com.tapha.hub.reading.application;

import java.time.Instant;

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
import com.tapha.hub.reading.presentation.ReadingRecordSummary;
import com.tapha.hub.reading.presentation.UpdateReadingRecordRequest;

@Service
public class ReadingRecordService {
    private final BookRepository bookRepository;
    private final ReadingRecordRepository recordRepository;

    public ReadingRecordService(BookRepository bookRepository, ReadingRecordRepository recordRepository) {
        this.bookRepository = bookRepository;
        this.recordRepository = recordRepository;
    }

    @Transactional
    public CreateReadingRecordResponse create(Long bookId, CreateReadingRecordRequest request) {
        Book book = bookRepository.findByIdAndUserId(bookId, request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
        int suggestedStart = getNextStartPage(bookId, book);
        int startPage = request.startPageOverride() == null ? suggestedStart : request.startPageOverride();
        if (request.endPage() < startPage) {
            throw new InvalidRequestException("끝난 페이지는 %d쪽보다 앞설 수 없어요.".formatted(startPage));
        }

        ReadingRecord saved = recordRepository.save(new ReadingRecord(
                bookId, request.userId(), startPage, request.endPage(), normalizeImpression(request.impression()), Instant.now()
        ));
        return new CreateReadingRecordResponse(ReadingRecordSummary.from(saved), saved.getEndPage() + 1);
    }

    @Transactional
    public CreateReadingRecordResponse update(Long bookId, Long recordId, UpdateReadingRecordRequest request) {
        bookRepository.findByIdAndUserId(bookId, request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("책을 찾을 수 없어요."));
        ReadingRecord record = findOwnedRecord(bookId, recordId, request.userId());
        boolean isLatest = isLatestRecord(bookId, recordId);
        if (!isLatest && request.endPage() != record.getEndPage()) {
            throw new InvalidRequestException("INVALID_RECORD_ACTION", "과거 기록은 감상만 수정할 수 있어요.");
        }
        if (isLatest && request.endPage() < record.getStartPage()) {
            throw new InvalidRequestException("끝난 페이지는 %d쪽보다 앞설 수 없어요.".formatted(record.getStartPage()));
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
        return impression == null || impression.isBlank() ? null : impression.trim();
    }
}

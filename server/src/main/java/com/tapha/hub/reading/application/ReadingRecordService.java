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
import com.tapha.hub.reading.presentation.ReadingRecordSummary;

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
        int suggestedStart = recordRepository.findTopByBookIdOrderByCreatedAtDescIdDesc(bookId)
                .map(record -> record.getEndPage() + 1)
                .orElse(book.getInitialPage());
        int startPage = request.startPageOverride() == null ? suggestedStart : request.startPageOverride();
        if (request.endPage() < startPage) {
            throw new InvalidRequestException("끝난 페이지는 %d쪽보다 앞설 수 없어요.".formatted(startPage));
        }

        ReadingRecord saved = recordRepository.save(new ReadingRecord(
                bookId, request.userId(), startPage, request.endPage(), normalizeImpression(request.impression()), Instant.now()
        ));
        return new CreateReadingRecordResponse(ReadingRecordSummary.from(saved), saved.getEndPage() + 1);
    }

    private String normalizeImpression(String impression) {
        return impression == null || impression.isBlank() ? null : impression.trim();
    }
}

package com.tapha.hub;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tapha.hub.user.domain.User;
import com.tapha.hub.user.domain.UserRepository;
import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.reading.domain.ReadingRecord;
import com.tapha.hub.reading.domain.ReadingRecordRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HubServerApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private ReadingRecordRepository readingRecordRepository;

	@Test
	void contextLoads() {
	}

    @Test
    void createsUserWithTrimmedNickname() throws Exception {
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nickname": " 다정 " }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nickname").value("다정"));
    }

    @Test
    void rejectsBlankNickname() throws Exception {
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nickname": "   " }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createsReadingBookWithDefaultInitialPage() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();

        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": %d,
                                  "title": " 아주 작은 습관의 힘 ",
                                  "author": "   "
                                }
                                """.formatted(userId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("아주 작은 습관의 힘"))
                .andExpect(jsonPath("$.author").doesNotExist())
                .andExpect(jsonPath("$.initialPage").value(1))
                .andExpect(jsonPath("$.status").value("READING"))
                .andExpect(jsonPath("$.nextStartPage").value(1));
    }

    @Test
    void rejectsUnknownBookOwner() throws Exception {
        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": 999999, "title": "독서 기록" }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void listsReadingBooksForOneUserInCreatedOrder() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        bookRepository.save(new Book(userId, "오래된 책", null, 1, Instant.parse("2026-07-01T00:00:00Z")));
        bookRepository.save(new Book(userId, "최근 책", "작가", 24, Instant.parse("2026-07-02T00:00:00Z")));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/users/{userId}/books", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.books.length()").value(2))
                .andExpect(jsonPath("$.books[0].title").value("최근 책"))
                .andExpect(jsonPath("$.books[0].nextStartPage").value(24))
                .andExpect(jsonPath("$.books[0].latestRecord").doesNotExist())
                .andExpect(jsonPath("$.books[1].title").value("오래된 책"));
    }

    @Test
    void getsBookDetailOnlyForItsOwner() throws Exception {
        Long ownerId = userRepository.save(new User("다정", Instant.now())).getId();
        Long otherUserId = userRepository.save(new User("서연", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(ownerId, "독서 기록", "작가", 18, Instant.now())).getId();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId)
                        .param("userId", String.valueOf(ownerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("독서 기록"))
                .andExpect(jsonPath("$.nextStartPage").value(18))
                .andExpect(jsonPath("$.latestRecord").doesNotExist())
                .andExpect(jsonPath("$.readingRecords.length()").value(0));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId)
                        .param("userId", String.valueOf(otherUserId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void savesReadingRecordAndAdvancesBookmark() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "독서 기록", null, 20, Instant.now())).getId();

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 32, "impression": "인상적인 문장이 있었어요." }
                                """.formatted(userId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.record.startPage").value(20))
                .andExpect(jsonPath("$.record.endPage").value(32))
                .andExpect(jsonPath("$.nextStartPage").value(33));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId).param("userId", String.valueOf(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStartPage").value(33))
                .andExpect(jsonPath("$.readingRecords.length()").value(1));

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 30 }
                                """.formatted(userId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAGE_RANGE"));
    }

    @Test
    void updatesStatusToCompletedWithOptionalReviewAndKeepsBookmark() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "독서 기록", null, 20, Instant.now())).getId();

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 32 }
                                """.formatted(userId)))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/books/{bookId}/status", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": %d,
                                  "status": "COMPLETED",
                                  "finalReview": "끝까지 읽고 나서야 전체 흐름이 보였어요."
                                }
                                """.formatted(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.finalReview").value("끝까지 읽고 나서야 전체 흐름이 보였어요."))
                .andExpect(jsonPath("$.completedAt").isNotEmpty())
                .andExpect(jsonPath("$.nextStartPage").value(33));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId)
                        .param("userId", String.valueOf(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.finalReview").value("끝까지 읽고 나서야 전체 흐름이 보였어요."))
                .andExpect(jsonPath("$.nextStartPage").value(33))
                .andExpect(jsonPath("$.readingRecords.length()").value(1));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/users/{userId}/books", userId)
                        .param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.books.length()").value(1));
    }

    @Test
    void archivesAndResumesBookWithoutChangingBookmark() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "잠시 멈춘 책", null, 1, Instant.now())).getId();

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 18 }
                                """.formatted(userId)))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/books/{bookId}/status", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "status": "ARCHIVED" }
                                """.formatted(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.nextStartPage").value(19));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/users/{userId}/books", userId)
                        .param("status", "ARCHIVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.books.length()").value(1));

        mockMvc.perform(patch("/api/books/{bookId}/status", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "status": "READING" }
                                """.formatted(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READING"))
                .andExpect(jsonPath("$.nextStartPage").value(19));
    }

    @Test
    void rejectsInvalidBookStatusTransitionAndUnknownOwner() throws Exception {
        Long ownerId = userRepository.save(new User("다정", Instant.now())).getId();
        Long otherUserId = userRepository.save(new User("서연", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(ownerId, "상태 확인", null, 1, Instant.now())).getId();

        mockMvc.perform(patch("/api/books/{bookId}/status", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "status": "READING" }
                                """.formatted(ownerId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_BOOK_STATUS"));

        mockMvc.perform(patch("/api/books/{bookId}/status", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "status": "ARCHIVED" }
                                """.formatted(otherUserId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void updatesLatestRecordAndRecalculatesBookmark() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "기록을 고치는 책", null, 10, Instant.now())).getId();
        readingRecordRepository.save(new ReadingRecord(
                bookId, userId, 10, 20, "처음 감상", Instant.parse("2026-07-01T00:00:00Z")
        ));
        ReadingRecord latest = readingRecordRepository.save(new ReadingRecord(
                bookId, userId, 21, 30, "두 번째 감상", Instant.parse("2026-07-02T00:00:00Z")
        ));

        mockMvc.perform(patch("/api/books/{bookId}/records/{recordId}", bookId, latest.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": %d,
                                  "endPage": 25,
                                  "impression": "고친 감상"
                                }
                                """.formatted(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.id").value(latest.getId()))
                .andExpect(jsonPath("$.record.startPage").value(21))
                .andExpect(jsonPath("$.record.endPage").value(25))
                .andExpect(jsonPath("$.record.impression").value("고친 감상"))
                .andExpect(jsonPath("$.nextStartPage").value(26));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId)
                        .param("userId", String.valueOf(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStartPage").value(26))
                .andExpect(jsonPath("$.readingRecords.length()").value(2))
                .andExpect(jsonPath("$.latestRecord.endPage").value(25));
    }

    @Test
    void deletesLatestRecordAndRestoresPreviousBookmark() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "기록을 지우는 책", null, 10, Instant.now())).getId();
        ReadingRecord previous = readingRecordRepository.save(new ReadingRecord(
                bookId, userId, 10, 20, "남는 감상", Instant.parse("2026-07-01T00:00:00Z")
        ));
        ReadingRecord latest = readingRecordRepository.save(new ReadingRecord(
                bookId, userId, 21, 30, "지울 감상", Instant.parse("2026-07-02T00:00:00Z")
        ));

        mockMvc.perform(delete("/api/books/{bookId}/records/{recordId}", bookId, latest.getId())
                        .param("userId", String.valueOf(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStartPage").value(21));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/books/{bookId}", bookId)
                        .param("userId", String.valueOf(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextStartPage").value(21))
                .andExpect(jsonPath("$.latestRecord.id").value(previous.getId()))
                .andExpect(jsonPath("$.readingRecords.length()").value(1));
    }

    @Test
    void allowsEditingOlderImpressionOnlyAndRejectsPageChangeAndOtherUser() throws Exception {
        Long ownerId = userRepository.save(new User("다정", Instant.now())).getId();
        Long otherUserId = userRepository.save(new User("서연", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(ownerId, "기록 권한", null, 1, Instant.now())).getId();
        ReadingRecord older = readingRecordRepository.save(new ReadingRecord(
                bookId, ownerId, 1, 10, null, Instant.parse("2026-07-01T00:00:00Z")
        ));
        ReadingRecord latest = readingRecordRepository.save(new ReadingRecord(
                bookId, ownerId, 11, 20, null, Instant.parse("2026-07-02T00:00:00Z")
        ));

        mockMvc.perform(patch("/api/books/{bookId}/records/{recordId}", bookId, older.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 10, "impression": "뒤늦게 남긴 감상" }
                                """.formatted(ownerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.endPage").value(10))
                .andExpect(jsonPath("$.record.impression").value("뒤늦게 남긴 감상"));

        mockMvc.perform(patch("/api/books/{bookId}/records/{recordId}", bookId, older.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "userId": %d, "endPage": 9 }
                                """.formatted(ownerId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RECORD_ACTION"));

        mockMvc.perform(delete("/api/books/{bookId}/records/{recordId}", bookId, latest.getId())
                        .param("userId", String.valueOf(otherUserId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

}

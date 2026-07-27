package com.tapha.hub;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.hibernate.SessionFactory;

import jakarta.persistence.EntityManagerFactory;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.book.application.BookMetadata;
import com.tapha.hub.book.application.BookMetadataClient;
import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.book.application.BookService;
import com.tapha.hub.reading.domain.ReadingRecord;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.user.domain.User;
import com.tapha.hub.user.domain.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(HubServerApplicationTests.TestBookMetadataConfig.class)
class HubServerApplicationTests {

    private static final String CSRF = "test-csrf";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;
    @Autowired ReadingRecordRepository recordRepository;
    @Autowired BookService bookService;
    @Autowired EntityManagerFactory entityManagerFactory;

    @TestConfiguration
    static class TestBookMetadataConfig {
        @Bean
        @Primary
        BookMetadataClient bookMetadataClient() {
            return new BookMetadataClient() {
                @Override
                public List<BookMetadata> search(String query) {
                    return List.of(get("test-volume"), get("another-volume"));
                }

                @Override
                public BookMetadata get(String providerId) {
                    return new BookMetadata(
                            "GOOGLE_BOOKS", providerId, "아주 작은 습관의 힘", null,
                            null, "9780306406157", "2018", 320
                    );
                }
            };
        }
    }

    @Test
    void createsBookAndReturnsPageCountInOneBookshelfResponse() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();

        mockMvc.perform(post("/api/books")
                        .session(session(userId))
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerId\":\"test-volume\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pageCount").value(320));

        mockMvc.perform(get("/api/bookshelf").session(session(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reading.length()").value(1))
                .andExpect(jsonPath("$.completed.length()").value(0))
                .andExpect(jsonPath("$.archived.length()").value(0))
                .andExpect(jsonPath("$.reading[0].pageCount").value(320));

        Long otherUserId = userRepository.save(new User("서연", Instant.now())).getId();
        mockMvc.perform(post("/api/books")
                        .session(session(otherUserId))
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerId\":\"test-volume\",\"initialPage\":321}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PAGE_RANGE"));
    }

    @Test
    void sessionIdentityOwnsBookAndReadingRecord() throws Exception {
        Long ownerId = userRepository.save(new User("다정", Instant.now())).getId();
        Long otherId = userRepository.save(new User("서연", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(ownerId, "독서 기록", null, 20, Instant.now())).getId();

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .session(session(otherId))
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endPage\":32}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .session(session(ownerId))
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endPage\":32}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.record.startPage").value(20))
                .andExpect(jsonPath("$.nextStartPage").value(33));
    }

    @Test
    void loadsBookshelfWithinThreeQueries() {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Book first = bookRepository.save(new Book(userId, "첫 책", null, 1, Instant.now()));
        Book second = bookRepository.save(new Book(userId, "둘째 책", null, 1, Instant.now()));
        recordRepository.save(new ReadingRecord(first.getId(), userId, 1, 10, null, null, Instant.now()));
        recordRepository.save(new ReadingRecord(second.getId(), userId, 1, 5, null, null, Instant.now()));

        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        bookService.getBooks(userId);

        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(3);
    }

    private MockHttpSession session(Long userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(SessionAuth.USER_ID, userId);
        session.setAttribute(SessionAuth.CSRF_TOKEN, CSRF);
        return session;
    }
}

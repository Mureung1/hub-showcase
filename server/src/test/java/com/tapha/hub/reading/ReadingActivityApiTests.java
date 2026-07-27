package com.tapha.hub.reading;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.reading.domain.ReadingRecord;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.user.domain.User;
import com.tapha.hub.user.domain.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReadingActivityApiTests {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;
    @Autowired ReadingRecordRepository recordRepository;

    @Test
    void groupsOnlyTheSessionUsersRecordsBySeoulDate() throws Exception {
        Long userId = userRepository.save(new User("독자", Instant.now())).getId();
        Long otherUserId = userRepository.save(new User("다른 독자", Instant.now())).getId();
        Book book = bookRepository.save(new Book(userId, "테스트 책", null, 1, Instant.now()));
        Book otherBook = bookRepository.save(new Book(otherUserId, "다른 책", null, 1, Instant.now()));

        recordRepository.save(new ReadingRecord(book.getId(), userId, 1, 1, null, null, Instant.parse("2026-06-30T15:00:00Z")));
        recordRepository.save(new ReadingRecord(book.getId(), userId, 2, 2, null, null, Instant.parse("2026-07-01T14:59:59Z")));
        recordRepository.save(new ReadingRecord(book.getId(), userId, 3, 3, null, null, Instant.parse("2026-07-01T15:00:00Z")));
        recordRepository.save(new ReadingRecord(otherBook.getId(), otherUserId, 1, 1, null, null, Instant.parse("2026-07-01T00:00:00Z")));

        mockMvc.perform(get("/api/reading-activity")
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-02")
                        .session(session(userId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("2026-07-01"))
                .andExpect(jsonPath("$.to").value("2026-07-02"))
                .andExpect(jsonPath("$.days.length()").value(2))
                .andExpect(jsonPath("$.days[0].date").value("2026-07-01"))
                .andExpect(jsonPath("$.days[0].count").value(2))
                .andExpect(jsonPath("$.days[1].date").value("2026-07-02"))
                .andExpect(jsonPath("$.days[1].count").value(1));
    }

    @Test
    void rejectsRangesLongerThanTwelveWeeks() throws Exception {
        Long userId = userRepository.save(new User("독자", Instant.now())).getId();

        mockMvc.perform(get("/api/reading-activity")
                        .param("from", "2026-04-01")
                        .param("to", "2026-07-01")
                        .session(session(userId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));
    }

    private MockHttpSession session(Long userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(SessionAuth.USER_ID, userId);
        return session;
    }
}

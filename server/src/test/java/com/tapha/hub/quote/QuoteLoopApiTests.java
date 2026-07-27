package com.tapha.hub.quote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.tapha.hub.auth.application.SessionAuth;
import com.tapha.hub.book.domain.Book;
import com.tapha.hub.book.domain.BookRepository;
import com.tapha.hub.quote.domain.QuoteExposureRepository;
import com.tapha.hub.quote.domain.QuoteRepository;
import com.tapha.hub.reading.domain.ReadingRecordRepository;
import com.tapha.hub.user.domain.User;
import com.tapha.hub.user.domain.UserRepository;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuoteLoopApiTests {

    private static final String CSRF = "test-csrf";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;
    @Autowired QuoteRepository quoteRepository;
    @Autowired QuoteExposureRepository exposureRepository;
    @Autowired ReadingRecordRepository recordRepository;

    @Test
    void savesQuoteWithRecordAndCompletesItsExposure() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "다시 읽을 책", null, 1, Instant.now())).getId();
        MockHttpSession session = session(userId);

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .session(session)
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endPage\":12,\"quoteText\":\" 오래 남은 문장 \"}"))
                .andExpect(status().isCreated());

        MvcResult random = mockMvc.perform(get("/api/quotes/random").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookId").value(bookId))
                .andExpect(jsonPath("$.text").value("오래 남은 문장"))
                .andReturn();
        Long quoteId = ((Number) objectMapper.readValue(
                random.getResponse().getContentAsString(), Map.class
        ).get("id")).longValue();

        MvcResult exposed = mockMvc.perform(post("/api/quote-exposures")
                        .session(session)
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quoteId\":" + quoteId + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long exposureId = ((Number) objectMapper.readValue(
                exposed.getResponse().getContentAsString(), Map.class
        ).get("id")).longValue();

        mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .session(session)
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endPage\":20,\"quoteExposureId\":" + exposureId + "}"))
                .andExpect(status().isCreated());

        assertThat(exposureRepository.findById(exposureId).orElseThrow().getCompletedReadingRecordId())
                .isNotNull();
    }

    @Test
    void deletingReadingRecordDoesNotDeleteIndependentQuote() throws Exception {
        Long userId = userRepository.save(new User("다정", Instant.now())).getId();
        Long bookId = bookRepository.save(new Book(userId, "독립 글귀", null, 1, Instant.now())).getId();
        MockHttpSession session = session(userId);

        MvcResult created = mockMvc.perform(post("/api/books/{bookId}/records", bookId)
                        .session(session)
                        .header("X-CSRF-Token", CSRF)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endPage\":5,\"quoteText\":\"남는 글귀\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Long recordId = ((Number) ((Map<?, ?>) objectMapper.readValue(
                created.getResponse().getContentAsString(), Map.class
        ).get("record")).get("id")).longValue();

        mockMvc.perform(delete("/api/books/{bookId}/records/{recordId}", bookId, recordId)
                        .session(session)
                        .header("X-CSRF-Token", CSRF))
                .andExpect(status().isOk());

        assertThat(recordRepository.findById(recordId)).isEmpty();
        assertThat(quoteRepository.findByBookIdAndUserIdOrderByCreatedAtDescIdDesc(bookId, userId))
                .hasSize(1);
    }

    private MockHttpSession session(Long userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(SessionAuth.USER_ID, userId);
        session.setAttribute(SessionAuth.CSRF_TOKEN, CSRF);
        return session;
    }
}

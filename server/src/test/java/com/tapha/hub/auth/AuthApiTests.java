package com.tapha.hub.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockHttpSession;

import tools.jackson.databind.ObjectMapper;

import com.tapha.hub.auth.application.GoogleIdentity;
import com.tapha.hub.auth.application.GoogleIdentityVerifier;
import com.tapha.hub.auth.presentation.InvalidGoogleCredentialException;
import com.tapha.hub.user.domain.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(AuthApiTests.TestGoogleIdentityConfig.class)
class AuthApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @TestConfiguration
    static class TestGoogleIdentityConfig {

        @Bean
        @Primary
        GoogleIdentityVerifier googleIdentityVerifier() {
            return new GoogleIdentityVerifier("test-client") {
                @Override
                public GoogleIdentity verify(String credential) {
                    if (!"valid-token".equals(credential)) {
                        throw new InvalidGoogleCredentialException();
                    }
                    return new GoogleIdentity("google-subject", "reader@example.com", "다정");
                }
            };
        }
    }

    @Test
    void logsInWithGoogleIdentityAndRestoresSession() throws Exception {
        MvcResult login = login();
        Map<?, ?> firstBody = objectMapper.readValue(login.getResponse().getContentAsString(), Map.class);
        Long firstUserId = ((Number) ((Map<?, ?>) firstBody.get("user")).get("id")).longValue();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        mockMvc.perform(get("/api/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.nickname").value("다정"))
                .andExpect(jsonPath("$.user.email").value("reader@example.com"))
                .andExpect(jsonPath("$.csrfToken").isNotEmpty());

        MvcResult secondLogin = login();
        Map<?, ?> secondBody = objectMapper.readValue(secondLogin.getResponse().getContentAsString(), Map.class);
        Long secondUserId = ((Number) ((Map<?, ?>) secondBody.get("user")).get("id")).longValue();
        org.assertj.core.api.Assertions.assertThat(secondUserId).isEqualTo(firstUserId);
        org.assertj.core.api.Assertions.assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void rejectsInvalidGoogleCredential() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"invalid\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_GOOGLE_CREDENTIAL"));
    }

    @Test
    void requiresSessionAndCsrfForProtectedMutation() throws Exception {
        mockMvc.perform(get("/api/bookshelf"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

        MvcResult login = login();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        Map<?, ?> body = objectMapper.readValue(login.getResponse().getContentAsString(), Map.class);
        String csrfToken = (String) body.get("csrfToken");

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_CSRF_TOKEN"));

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .header("X-CSRF-Token", csrfToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/session").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void allowsCorsPreflightWithoutSession() throws Exception {
        mockMvc.perform(options("/api/books/search")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk());
    }

    private MvcResult login() throws Exception {
        return mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"valid-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andReturn();
    }
}

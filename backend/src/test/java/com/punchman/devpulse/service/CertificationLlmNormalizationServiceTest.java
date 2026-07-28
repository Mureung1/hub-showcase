package com.punchman.devpulse.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.collector.groq.GroqChatClient;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.repository.jpa.CertificationLlmMatchRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CertificationLlmNormalizationServiceTest {

    private final JobPostingRepository jobPostingRepository = mock(JobPostingRepository.class);
    private final CertificationRepository certificationRepository = mock(CertificationRepository.class);
    private final CertificationLlmMatchRepository certificationLlmMatchRepository =
            mock(CertificationLlmMatchRepository.class);
    private final CertificationMentionRecalculationService certificationMentionRecalculationService =
            mock(CertificationMentionRecalculationService.class);
    private final GroqChatClient groqChatClient = mock(GroqChatClient.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private CertificationLlmNormalizationService service;

    private static final Certification SQLD = Certification.builder().id(1L).name("SQLD").build();
    private static final String JOB_TITLE = "테스트직무";

    @BeforeEach
    void setUp() {
        service = new CertificationLlmNormalizationService(
                jobPostingRepository, certificationRepository, certificationLlmMatchRepository,
                certificationMentionRecalculationService, groqChatClient, objectMapper,
                "test-api-key", "test-model");
        when(certificationRepository.findAll()).thenReturn(List.of(SQLD));
    }

    @Test
    void noCandidatesSkipsGroqCallEntirely() {
        JobPosting rulematched = JobPosting.builder().id(10L)
                .applicationQualification("SQLD 소지자").preferenceDetail(null).build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(rulematched));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isZero();
        verify(groqChatClient, never()).chatCompletion(anyString(), anyString());
        verify(certificationMentionRecalculationService, never()).recalculate(anyString());
    }

    @Test
    void validMatchIsSavedAndTriggersRecalculation() {
        JobPosting candidate = JobPosting.builder().id(20L)
                .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(candidate));
        when(certificationLlmMatchRepository.existsByJobPostingIdAndCertificationId(20L, 1L)).thenReturn(false);
        when(groqChatClient.chatCompletion(anyString(), anyString())).thenReturn(
                envelopeWith("{\"results\":[{\"postingIndex\":0,\"matches\":"
                        + "[{\"certificationName\":\"SQLD\",\"field\":\"PREFERENCE\","
                        + "\"evidence\":\"관련 자격증 소지자 우대\"}]}]}"));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isEqualTo(1);
        verify(certificationLlmMatchRepository, times(1)).save(any());
        verify(certificationMentionRecalculationService, times(1)).recalculate(JOB_TITLE);
    }

    @Test
    void hallucinatedCertificationNameNotInCatalogIsIgnored() {
        JobPosting candidate = JobPosting.builder().id(21L)
                .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(candidate));
        when(groqChatClient.chatCompletion(anyString(), anyString())).thenReturn(
                envelopeWith("{\"results\":[{\"postingIndex\":0,\"matches\":"
                        + "[{\"certificationName\":\"존재하지않는자격증\",\"field\":\"PREFERENCE\","
                        + "\"evidence\":\"관련 자격증 소지자 우대\"}]}]}"));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isZero();
        verify(certificationLlmMatchRepository, never()).save(any());
        verify(certificationMentionRecalculationService, never()).recalculate(anyString());
    }

    @Test
    void evidenceNotFoundInSourceTextIsRejectedAsHallucination() {
        JobPosting candidate = JobPosting.builder().id(24L)
                .applicationQualification(null).preferenceDetail("학력 제한 없음").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(candidate));
        when(groqChatClient.chatCompletion(anyString(), anyString())).thenReturn(
                envelopeWith("{\"results\":[{\"postingIndex\":0,\"matches\":"
                        + "[{\"certificationName\":\"SQLD\",\"field\":\"PREFERENCE\","
                        + "\"evidence\":\"SQLD 자격증 소지자 우대\"}]}]}"));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isZero();
        verify(certificationLlmMatchRepository, never()).save(any());
    }

    @Test
    void alreadyRecordedMatchIsNotSavedTwice() {
        JobPosting candidate = JobPosting.builder().id(22L)
                .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(candidate));
        when(certificationLlmMatchRepository.existsByJobPostingIdAndCertificationId(22L, 1L)).thenReturn(true);
        when(groqChatClient.chatCompletion(anyString(), anyString())).thenReturn(
                envelopeWith("{\"results\":[{\"postingIndex\":0,\"matches\":"
                        + "[{\"certificationName\":\"SQLD\",\"field\":\"PREFERENCE\","
                        + "\"evidence\":\"관련 자격증 소지자 우대\"}]}]}"));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isZero();
        verify(certificationLlmMatchRepository, never()).save(any());
    }

    @Test
    void candidatesLargerThanBatchLimitAreSplitAcrossMultipleGroqCalls() {
        List<JobPosting> candidates = new java.util.ArrayList<>();
        for (long i = 0; i < 9; i++) {
            candidates.add(JobPosting.builder().id(100L + i)
                    .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build());
        }
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(candidates);
        when(groqChatClient.chatCompletion(anyString(), anyString())).thenReturn(
                envelopeWith("{\"results\":[]}"));

        service.normalize(JOB_TITLE);

        // 배치 크기(8)보다 후보가 많으므로(9건) 2번의 Groq 호출로 나뉘어야 한다.
        verify(groqChatClient, times(2)).chatCompletion(anyString(), anyString());
    }

    @Test
    void groqCallFailureIsCaughtAndReturnsZeroInsteadOfThrowing() {
        JobPosting candidate = JobPosting.builder().id(23L)
                .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(candidate));
        when(groqChatClient.chatCompletion(anyString(), anyString()))
                .thenThrow(new RuntimeException("Groq 호출 실패 시뮬레이션"));

        int newMatchCount = service.normalize(JOB_TITLE);

        assertThat(newMatchCount).isZero();
        verify(certificationMentionRecalculationService, never()).recalculate(anyString());
    }

    private String envelopeWith(String content) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "choices", List.of(Map.of("message", Map.of("content", content)))));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

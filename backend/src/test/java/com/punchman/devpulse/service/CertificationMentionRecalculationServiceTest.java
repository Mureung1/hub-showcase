package com.punchman.devpulse.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationLlmMatch;
import com.punchman.devpulse.domain.CertificationMention;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
import com.punchman.devpulse.repository.jpa.CertificationLlmMatchRepository;
import com.punchman.devpulse.repository.jpa.CertificationMentionRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * 규칙 매칭이 실패한 (공고, 자격증) 조합을 CertificationLlmMatch 원장이 보충해줄 때
 * essential/preferred에 정확히 반영되고, 규칙이 이미 잡은 조합은 원장이 있어도 중복
 * 집계되지 않는지 확인한다.
 */
class CertificationMentionRecalculationServiceTest {

    private static final String JOB_TITLE = "테스트직무";

    private final JobPostingRepository jobPostingRepository = mock(JobPostingRepository.class);
    private final CertificationMentionRepository certificationMentionRepository =
            mock(CertificationMentionRepository.class);
    private final CertificationRepository certificationRepository = mock(CertificationRepository.class);
    private final CertificationLlmMatchRepository certificationLlmMatchRepository =
            mock(CertificationLlmMatchRepository.class);

    private CertificationMentionRecalculationService service;

    private static final Certification SQLD = Certification.builder().id(1L).name("SQLD").build();

    @BeforeEach
    void setUp() {
        service = new CertificationMentionRecalculationService(
                jobPostingRepository, certificationMentionRepository, certificationRepository,
                certificationLlmMatchRepository);
        when(certificationRepository.findAll()).thenReturn(List.of(SQLD));
        when(certificationMentionRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of());
    }

    @Test
    void llmLedgerMatchIsReflectedWhenRuleMatchingFails() {
        JobPosting posting = JobPosting.builder().id(30L)
                .applicationQualification(null).preferenceDetail("관련 자격증 소지자 우대").build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(posting));
        when(certificationLlmMatchRepository.findByJobPostingJobTitle(JOB_TITLE)).thenReturn(List.of(
                CertificationLlmMatch.builder()
                        .jobPosting(posting)
                        .certification(SQLD)
                        .mentionField(MentionField.PREFERENCE)
                        .build()));

        service.recalculate(JOB_TITLE);

        CertificationMention saved = capturedSavedMention();
        assertThat(saved.getMentionCount()).isEqualTo(1);
        assertThat(saved.getPreferredMentionCount()).isEqualTo(1);
        assertThat(saved.getEssentialMentionCount()).isEqualTo(0);
    }

    @Test
    void ruleMatchTakesPrecedenceOverLedgerNoDoubleCounting() {
        JobPosting posting = JobPosting.builder().id(31L)
                .applicationQualification("SQLD 자격 소지자").preferenceDetail(null).build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(posting));
        // 규칙이 이미 QUALIFICATION으로 잡았으므로, 후보 선별 로직상 이 공고는 원장에 안 들어가야
        // 정상이지만, 혹시 원장에 잘못 들어가 있어도 이중 집계되지 않는지 방어적으로 확인한다.
        when(certificationLlmMatchRepository.findByJobPostingJobTitle(JOB_TITLE)).thenReturn(List.of(
                CertificationLlmMatch.builder()
                        .jobPosting(posting)
                        .certification(SQLD)
                        .mentionField(MentionField.PREFERENCE)
                        .build()));

        service.recalculate(JOB_TITLE);

        CertificationMention saved = capturedSavedMention();
        assertThat(saved.getMentionCount()).isEqualTo(1);
        assertThat(saved.getEssentialMentionCount()).isEqualTo(1);
        assertThat(saved.getPreferredMentionCount()).isEqualTo(0);
    }

    @Test
    void noRuleOrLedgerMatchResultsInZeroMentions() {
        JobPosting posting = JobPosting.builder().id(32L)
                .applicationQualification("관련 없음").preferenceDetail(null).build();
        when(jobPostingRepository.findByJobTitle(JOB_TITLE)).thenReturn(List.of(posting));
        when(certificationLlmMatchRepository.findByJobPostingJobTitle(JOB_TITLE)).thenReturn(List.of());

        service.recalculate(JOB_TITLE);

        CertificationMention saved = capturedSavedMention();
        assertThat(saved.getMentionCount()).isEqualTo(0);
    }

    private CertificationMention capturedSavedMention() {
        ArgumentCaptor<CertificationMention> captor = ArgumentCaptor.forClass(CertificationMention.class);
        verify(certificationMentionRepository).save(captor.capture());
        return captor.getValue();
    }
}

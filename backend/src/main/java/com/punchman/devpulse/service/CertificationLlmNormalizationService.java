package com.punchman.devpulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.collector.groq.GroqChatClient;
import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationLlmMatch;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
import com.punchman.devpulse.normalizer.GroqNormalizationPrompt;
import com.punchman.devpulse.normalizer.GroqNormalizationResponseParser;
import com.punchman.devpulse.normalizer.GroqNormalizationResult;
import com.punchman.devpulse.normalizer.LlmNormalizationCandidateSelector;
import com.punchman.devpulse.repository.jpa.CertificationLlmMatchRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 규칙 기반 매칭이 놓친 (jobTitle) 공고를 LLM(Groq) 배치 호출로 재검사한다. 이 서비스는
 * 오직 신규 엔드포인트(POST /api/certification-mentions/normalize-llm)에서만 호출된다 —
 * Kafka 컨슈머 경로(JobPostingCollectedConsumer)는 전혀 안 건드려서 "실시간 스트리밍 금지"
 * 원칙을 지킨다. LLM 호출은 후보 전체를 한 번에(또는 소수의 배치로) 묶어서 한다.
 */
@Service
public class CertificationLlmNormalizationService {

    private static final Logger log = LoggerFactory.getLogger(CertificationLlmNormalizationService.class);

    private final JobPostingRepository jobPostingRepository;
    private final CertificationRepository certificationRepository;
    private final CertificationLlmMatchRepository certificationLlmMatchRepository;
    private final CertificationMentionRecalculationService certificationMentionRecalculationService;
    private final GroqChatClient groqChatClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public CertificationLlmNormalizationService(
            JobPostingRepository jobPostingRepository,
            CertificationRepository certificationRepository,
            CertificationLlmMatchRepository certificationLlmMatchRepository,
            CertificationMentionRecalculationService certificationMentionRecalculationService,
            GroqChatClient groqChatClient,
            ObjectMapper objectMapper,
            @Value("${devpulse.groq.api-key}") String apiKey,
            @Value("${devpulse.groq.model}") String model) {
        this.jobPostingRepository = jobPostingRepository;
        this.certificationRepository = certificationRepository;
        this.certificationLlmMatchRepository = certificationLlmMatchRepository;
        this.certificationMentionRecalculationService = certificationMentionRecalculationService;
        this.groqChatClient = groqChatClient;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Transactional
    public int normalize(String jobTitle) {
        List<JobPosting> postings = jobPostingRepository.findByJobTitle(jobTitle);
        List<Certification> certifications = certificationRepository.findAll();
        List<JobPosting> candidates = LlmNormalizationCandidateSelector.selectCandidates(postings, certifications);
        if (candidates.isEmpty()) {
            log.info("LLM 정규화 후보 없음: jobTitle={}", jobTitle);
            return 0;
        }

        String requestBody = GroqNormalizationPrompt.buildRequestBody(objectMapper, model, candidates, certifications);
        String rawResponse;
        try {
            rawResponse = groqChatClient.chatCompletion(apiKey, requestBody);
        } catch (Exception e) {
            log.error("Groq 호출 실패, 이번 정규화는 건너뜀: jobTitle={}", jobTitle, e);
            return 0;
        }

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);
        int savedCount = saveValidMatches(result, candidates, certifications);

        if (savedCount > 0) {
            certificationMentionRecalculationService.recalculate(jobTitle);
        }
        return savedCount;
    }

    private int saveValidMatches(
            GroqNormalizationResult result, List<JobPosting> candidates, List<Certification> certifications) {
        Map<String, Certification> certificationsByName = certifications.stream()
                .collect(Collectors.toMap(Certification::getName, Function.identity()));

        int savedCount = 0;
        for (GroqNormalizationResult.PostingMatch postingMatch : result.results()) {
            if (postingMatch.postingIndex() < 0 || postingMatch.postingIndex() >= candidates.size()) {
                continue;
            }
            JobPosting posting = candidates.get(postingMatch.postingIndex());

            for (GroqNormalizationResult.CertificationMatch match : postingMatch.matches()) {
                Certification certification = certificationsByName.get(match.certificationName());
                MentionField field = toMentionField(match.field());
                if (certification == null || field == null) {
                    log.warn("LLM이 목록에 없는 자격증명/필드를 반환해 무시함: certificationName={}, field={}",
                            match.certificationName(), match.field());
                    continue;
                }
                if (certificationLlmMatchRepository.existsByJobPostingIdAndCertificationId(
                        posting.getId(), certification.getId())) {
                    continue;
                }
                certificationLlmMatchRepository.save(CertificationLlmMatch.builder()
                        .jobPosting(posting)
                        .certification(certification)
                        .mentionField(field)
                        .build());
                savedCount++;
            }
        }
        return savedCount;
    }

    private MentionField toMentionField(String field) {
        if ("QUALIFICATION".equals(field)) {
            return MentionField.QUALIFICATION;
        }
        if ("PREFERENCE".equals(field)) {
            return MentionField.PREFERENCE;
        }
        return null;
    }
}

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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 규칙 기반 매칭이 놓친 (jobTitle) 공고를 LLM(Groq) 배치 호출로 재검사한다. 이 서비스는
 * 오직 신규 엔드포인트(POST /api/certification-mentions/normalize-llm)에서만 호출된다 —
 * Kafka 컨슈머 경로(JobPostingCollectedConsumer)는 전혀 안 건드려서 "실시간 스트리밍 금지"
 * 원칙을 지킨다.
 *
 * 후보 전체를 한 요청에 다 넣으면 Groq 무료 tier의 분당 토큰 한도(TPM)를 넘을 수 있다 —
 * 실측으로 확인됨(반도체 품질관리 후보 32건 = 15923 토큰 요청, 한도 12000 초과로 413).
 * 그래서 후보를 작은 배치로 쪼개 여러 번 호출한다 — 여전히 "배치 호출"이지 공고당 1회
 * 호출이 아니다. 배치 하나만으로는 한도 안에 들어와도 연달아 쏘면 롤링 윈도 누적으로
 * 429가 날 수 있어(이것도 실측 확인) 배치 사이에 짧게 대기한다. 한 배치가 재시도까지
 * 실패해도 나머지 배치는 계속 처리한다.
 */
@Service
public class CertificationLlmNormalizationService {

    private static final Logger log = LoggerFactory.getLogger(CertificationLlmNormalizationService.class);
    private static final int MAX_CANDIDATES_PER_BATCH = 8;
    private static final long BATCH_INTERVAL_MILLIS = 2000;

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

        int savedCount = 0;
        List<List<JobPosting>> batches = chunk(candidates, MAX_CANDIDATES_PER_BATCH);
        for (int i = 0; i < batches.size(); i++) {
            if (i > 0) {
                sleepBetweenBatches();
            }
            savedCount += normalizeBatch(batches.get(i), certifications);
        }

        if (savedCount > 0) {
            certificationMentionRecalculationService.recalculate(jobTitle);
        }
        return savedCount;
    }

    /**
     * 배치 하나만으로는 Groq 무료 tier 분당 토큰 한도(TPM) 안에 들어와도, 배치를 연달아 쏘면
     * 롤링 윈도 안에서 누적 토큰이 한도를 넘어 429가 날 수 있다 — 실측으로 확인됨(첫 배치
     * 6295 토큰 사용 후 곧바로 다음 배치 5867 토큰 요청 시 합계가 12000 초과로 거부).
     * 429를 받으면 서버가 알려준 대기 시간만큼 쉬었다가 그 배치만 한 번 재시도한다.
     */
    private int normalizeBatch(List<JobPosting> batch, List<Certification> certifications) {
        String requestBody = GroqNormalizationPrompt.buildRequestBody(objectMapper, model, batch, certifications);
        String rawResponse;
        try {
            rawResponse = groqChatClient.chatCompletion(apiKey, requestBody);
        } catch (FeignException.TooManyRequests e) {
            log.warn("Groq 배치 호출이 rate limit(429)에 걸림, 잠시 대기 후 한 번 재시도: batchSize={}", batch.size());
            sleepBetweenBatches();
            try {
                rawResponse = groqChatClient.chatCompletion(apiKey, requestBody);
            } catch (Exception retryFailure) {
                log.error("Groq 배치 재시도도 실패, 이 배치는 건너뜀(나머지 배치는 계속 진행): batchSize={}",
                        batch.size(), retryFailure);
                return 0;
            }
        } catch (Exception e) {
            log.error("Groq 배치 호출 실패, 이 배치는 건너뜀(나머지 배치는 계속 진행): batchSize={}", batch.size(), e);
            return 0;
        }

        GroqNormalizationResult result = GroqNormalizationResponseParser.parse(objectMapper, rawResponse);
        return saveValidMatches(result, batch, certifications);
    }

    private void sleepBetweenBatches() {
        try {
            Thread.sleep(BATCH_INTERVAL_MILLIS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static <T> List<List<T>> chunk(List<T> list, int size) {
        List<List<T>> chunks = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            chunks.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return chunks;
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
                if (!evidenceExistsInSourceText(posting, field, match.evidence())) {
                    log.warn("LLM이 인용한 근거가 실제 원문에 없어 무시함(할루시네이션 의심): "
                                    + "certificationName={}, field={}, evidence={}",
                            match.certificationName(), match.field(), match.evidence());
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

    /**
     * LLM의 자기 신고(evidence)를 그대로 믿지 않고, 그 인용문이 실제로 해당 공고의 대응
     * 필드(자격요건/우대사항) 원문에 문자 그대로 있는지 기계적으로 재확인한다. 실측에서
     * LLM이 원문에 아예 없는 자격증을 지어낸 사례가 있었기 때문 — 그런 경우 evidence
     * 자체가 원문에 없거나, 있어도 다른 자격증 이름을 잘못 붙인 경우가 많아 이 검증이
     * 상당수를 걸러낸다(완전히 안전하진 않지만 "인용조차 못 하면 최소한 걸러진다"는
     * 방어선).
     */
    private boolean evidenceExistsInSourceText(JobPosting posting, MentionField field, String evidence) {
        String sourceText = field == MentionField.QUALIFICATION
                ? posting.getApplicationQualification()
                : posting.getPreferenceDetail();
        return sourceText != null && sourceText.contains(evidence);
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

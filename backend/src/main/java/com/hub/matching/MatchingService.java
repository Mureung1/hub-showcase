package com.hub.matching;

import java.util.Comparator;
import com.hub.common.ApiException;
import com.hub.credential.Credential;
import com.hub.credential.CredentialRepository;
import com.hub.position.JobPosting;
import com.hub.position.JobPostingRepository;
import com.hub.position.JobRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.HashMap;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** F4 랭킹 · F5 상세 */
@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(ZoneId.of("Asia/Seoul"));

    private final MatchingEngine engine;
    private final MatchScoreRepository matchScoreRepository;
    private final JobPostingRepository postingRepository;
    private final CredentialRepository credentialRepository;

    /**
     * 이력이 바뀌면 전체 포지션의 점수를 다시 계산한다.
     * MVP 규모(수백 건)에서는 동기로 충분하다. 커지면 잡 큐로 뺀다.
     */
    @Transactional
    public void recalculate(Long userId) {
        List<Credential> credentials = credentialRepository.findByUserIdOrderByStartedOnDesc(userId);

        matchScoreRepository.deleteAll(matchScoreRepository.findByUserIdOrderByScoreDesc(userId));

        List<MatchScore> scores = postingRepository.findAll().stream()
                .map(posting -> engine.calculate(userId, posting, credentials))
                .toList();

        matchScoreRepository.saveAll(scores);
    }

    /**
     * F4 — 적합도 순 목록
     */
    @Transactional(readOnly = true)
    public List<PositionDto.Summary> listRanked(Long userId) {
        List<MatchScore> scores = matchScoreRepository.findByUserIdOrderByScoreDesc(userId);
        if (scores.isEmpty()) return List.of();

        List<Long> postingIds = scores.stream().map(MatchScore::getPostingId).toList();

        Map<Long, JobPosting> postings = postingRepository.findAllById(postingIds)
                .stream()
                .collect(Collectors.toMap(JobPosting::getId, Function.identity()));

        // 공고별 태그 — 가중치 상위 3개 subject. 쿼리 한 번으로 N+1 회피.
        Map<Long, List<String>> tagsByPosting = new HashMap<>();
        for (Object[] row : postingRepository.findSubjectsByPostingIds(postingIds)) {
            tagsByPosting
                    .computeIfAbsent((Long) row[0], k -> new ArrayList<>())
                    .add((String) row[1]);
        }

        return scores.stream()
                .map(s -> {
                    JobPosting p = postings.get(s.getPostingId());
                    List<String> tags = tagsByPosting.getOrDefault(p.getId(), List.of())
                            .stream().distinct().limit(3).toList();
                    return new PositionDto.Summary(
                            p.getId(), p.getCompany(), p.getTitle(), p.getLocation(),
                            p.getExperience(), s.getScore(), DATE.format(p.getCreatedAt()),
                            p.getSourceUrl(), tags);
                })
                .toList();
    }

    /**
     * F5 — 상세 + 근거
     */
    @Transactional(readOnly = true)
    public PositionDto.Detail detail(Long userId, Long postingId) {
        JobPosting posting = postingRepository.findWithRequirements(postingId)
                .orElseThrow(() -> ApiException.notFound("포지션"));

        MatchScore score = matchScoreRepository.findWithDetails(userId, postingId)
                .orElseThrow(() -> ApiException.notFound("적합도 계산 결과"));

        Map<Long, MatchDetail> byRequirement = score.getDetails().stream()
                .collect(Collectors.toMap(MatchDetail::getRequirementId, Function.identity()));

        List<PositionDto.RequirementView> requirements = posting.getRequirements().stream()
                .sorted(Comparator.comparingDouble(
                        r -> -(r.getWeight() == null ? 0 : r.getWeight().doubleValue())))
                .map(req -> toView(req, byRequirement.get(req.getId())))
                .toList();

        double fulfillmentSum = requirements.stream()
                .mapToDouble(r -> r.weight() * r.fulfillment())
                .sum();

        return new PositionDto.Detail(
                posting.getId(), posting.getCompany(), posting.getTitle(), posting.getLocation(),
                posting.getExperience(), score.getScore(), posting.getSourceUrl(),
                DATE.format(posting.getCreatedAt()), fulfillmentSum, requirements,
                AdviceGenerator.generate(requirements));
    }

    private PositionDto.RequirementView toView(JobRequirement req, MatchDetail detail) {
        double fulfillment = detail == null ? 0 : detail.getFulfillment().doubleValue();
        String evidence = detail == null ? "해당 이력 없음" : detail.getEvidence();
        double weight = req.getWeight() == null ? 0 : req.getWeight().doubleValue();   // ← 변경
        return new PositionDto.RequirementView(
                req.getName(), req.isRequired(), weight, fulfillment, evidence);
    }
}

package com.placepick.recommendation.application.scoring;

import com.placepick.recommendation.application.candidate.CandidateNormalizer;
import com.placepick.recommendation.application.candidate.CandidateQueryPlan;
import com.placepick.recommendation.application.candidate.CandidateQueryPlanner;
import com.placepick.recommendation.application.port.out.BlogSearchPort;
import com.placepick.recommendation.application.port.out.BlogSearchQuery;
import com.placepick.recommendation.application.port.out.PlaceSearchItem;
import com.placepick.recommendation.application.port.out.PlaceSearchPort;
import com.placepick.recommendation.application.port.out.PlaceSearchQuery;
import com.placepick.recommendation.application.port.out.SearchProviderException;
import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.candidate.NormalizedCandidate;
import com.placepick.recommendation.domain.scoring.EvidenceLevel;
import com.placepick.recommendation.domain.scoring.RankedPlace;
import com.placepick.recommendation.domain.scoring.RecommendationWarning;
import com.placepick.recommendation.domain.scoring.ScoredCandidate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Pure application orchestration for PP-014/PP-015. Provider implementations are supplied through
 * ports; this service has no Spring, persistence, or HTTP dependency.
 */
public final class CandidateRankingService {

    private static final int REQUIRED_RESULT_SIZE = 3;
    private static final int PRELIMINARY_POOL_SIZE = 5;

    private final PlaceSearchPort placeSearchPort;
    private final BlogSearchPort blogSearchPort;
    private final CandidateQueryPlanner queryPlanner;
    private final CandidateNormalizer normalizer;
    private final CandidateRanker ranker;
    private final Supplier<UUID> placeIdSupplier;

    public CandidateRankingService(
        PlaceSearchPort placeSearchPort,
        BlogSearchPort blogSearchPort,
        CandidateQueryPlanner queryPlanner,
        CandidateNormalizer normalizer,
        CandidateRanker ranker
    ) {
        this(
            placeSearchPort,
            blogSearchPort,
            queryPlanner,
            normalizer,
            ranker,
            UUID::randomUUID
        );
    }

    public CandidateRankingService(
        PlaceSearchPort placeSearchPort,
        BlogSearchPort blogSearchPort,
        CandidateQueryPlanner queryPlanner,
        CandidateNormalizer normalizer,
        CandidateRanker ranker,
        Supplier<UUID> placeIdSupplier
    ) {
        this.placeSearchPort = Objects.requireNonNull(placeSearchPort, "placeSearchPort");
        this.blogSearchPort = Objects.requireNonNull(blogSearchPort, "blogSearchPort");
        this.queryPlanner = Objects.requireNonNull(queryPlanner, "queryPlanner");
        this.normalizer = Objects.requireNonNull(normalizer, "normalizer");
        this.ranker = Objects.requireNonNull(ranker, "ranker");
        this.placeIdSupplier = Objects.requireNonNull(placeIdSupplier, "placeIdSupplier");
    }

    public CandidateRankingResult rank(ConfirmedRecommendationCondition condition) {
        Objects.requireNonNull(condition, "condition");
        CandidateQueryPlan initialPlan = queryPlanner.initial(condition);
        List<PlaceSearchItem> localItems = new ArrayList<>(searchPlaces(initialPlan));
        int placeSearchCalls = 1;
        boolean relaxed = false;

        List<NormalizedCandidate> eligible = normalizer.normalizeEligible(localItems, condition);
        if (eligible.size() < REQUIRED_RESULT_SIZE) {
            CandidateQueryPlan relaxedPlan = queryPlanner.relax(initialPlan)
                .orElseThrow(InsufficientCandidatesException::new);
            localItems.addAll(searchPlaces(relaxedPlan));
            placeSearchCalls++;
            relaxed = true;
            eligible = normalizer.normalizeEligible(localItems, condition);
        }
        if (eligible.size() < REQUIRED_RESULT_SIZE) {
            throw new InsufficientCandidatesException();
        }

        List<NormalizedCandidate> preliminaryPool = ranker.rank(
            condition,
            eligible,
            Map.of()
        ).stream()
            .limit(PRELIMINARY_POOL_SIZE)
            .map(ScoredCandidate::candidate)
            .toList();

        Map<NormalizedCandidate, List<CandidateEvidence>> evidenceByCandidate = new HashMap<>();
        boolean degraded = false;
        int blogSearchCalls = 0;
        for (NormalizedCandidate candidate : preliminaryPool) {
            try {
                blogSearchCalls++;
                List<CandidateEvidence> evidence = normalizer.normalizeEvidence(
                    candidate,
                    blogSearchPort.searchBlogs(new BlogSearchQuery(
                        queryPlanner.blogQuery(candidate.name(), condition.locationQuery()),
                        3
                    )).items()
                );
                evidenceByCandidate.put(candidate, evidence);
            } catch (SearchProviderException exception) {
                evidenceByCandidate.clear();
                degraded = true;
                break;
            }
        }

        List<ScoredCandidate> topThree = ranker.rank(
            condition,
            preliminaryPool,
            evidenceByCandidate
        ).stream().limit(REQUIRED_RESULT_SIZE).toList();
        List<RankedPlace> places = topThree.stream()
            .map(candidate -> new RankedPlace(
                placeIdSupplier.get(),
                candidate.candidate(),
                candidate.evidence(),
                candidate.scoreBreakdown()
            ))
            .toList();

        Set<RecommendationWarning> warnings = EnumSet.noneOf(RecommendationWarning.class);
        if (condition.budgetPerPersonMin() != null || condition.budgetPerPersonMax() != null) {
            warnings.add(RecommendationWarning.BUDGET_EVIDENCE_UNAVAILABLE);
        }
        if (degraded) {
            warnings.add(RecommendationWarning.BLOG_EVIDENCE_UNAVAILABLE);
        }
        return new CandidateRankingResult(
            places,
            degraded ? EvidenceLevel.LOCAL_ONLY : EvidenceLevel.LOCAL_AND_BLOG,
            degraded,
            List.copyOf(warnings),
            relaxed,
            placeSearchCalls,
            blogSearchCalls
        );
    }

    private List<PlaceSearchItem> searchPlaces(CandidateQueryPlan plan) {
        return placeSearchPort.searchPlaces(new PlaceSearchQuery(plan.query(), 5)).items();
    }
}

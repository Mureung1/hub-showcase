package com.placepick.recommendation.workflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.placepick.recommendation.application.candidate.CandidateNormalizer;
import com.placepick.recommendation.application.candidate.CandidateQueryPlanner;
import com.placepick.recommendation.application.candidate.CategoryTaxonomy;
import com.placepick.recommendation.application.candidate.LocationMatcher;
import com.placepick.recommendation.application.port.out.BlogSearchItem;
import com.placepick.recommendation.application.port.out.BlogSearchPort;
import com.placepick.recommendation.application.port.out.BlogSearchQuery;
import com.placepick.recommendation.application.port.out.BlogSearchResult;
import com.placepick.recommendation.application.port.out.PlaceSearchItem;
import com.placepick.recommendation.application.port.out.PlaceSearchPort;
import com.placepick.recommendation.application.port.out.PlaceSearchQuery;
import com.placepick.recommendation.application.port.out.PlaceSearchResult;
import com.placepick.recommendation.application.scoring.CandidateRanker;
import com.placepick.recommendation.application.scoring.CandidateRankingService;
import com.placepick.recommendation.application.scoring.CandidateScoringPolicy;
import com.placepick.recommendation.condition.application.port.out.ConditionExtractionPort;
import com.placepick.recommendation.condition.application.port.out.ExtractionCommand;
import com.placepick.recommendation.condition.application.port.out.ExtractionOutcome;
import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.condition.domain.DraftRecommendationCondition;
import com.placepick.recommendation.condition.infrastructure.mock.DeterministicConditionExtractionAdapter;
import com.placepick.recommendation.reason.application.GroundedReasonService;
import com.placepick.recommendation.reason.application.port.out.GroundedReasonGenerationPort;
import com.placepick.recommendation.reason.application.port.out.ReasonGenerationCommand;
import com.placepick.recommendation.reason.application.port.out.ReasonGenerationOutcome;
import com.placepick.recommendation.reason.domain.GeneratedReasonBatch;
import com.placepick.recommendation.reason.domain.PlaceReasonStatements;
import com.placepick.recommendation.reason.domain.ReasonStatement;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class RecommendationCoreLinkedMockIntegrationTest {

    @Test
    void linksTheSyntheticWorkflowInEightCallsOnlyAfterExplicitConfirmation() throws Exception {
        WorkflowFixture fixture = fixture(List.of(places(1, 5)));

        ExtractionOutcome extracted = fixture.extractionPort.extract(extractionCommand());
        assertThat(extracted.extracted()).isTrue();
        assertThat(extracted.condition()).isInstanceOf(DraftRecommendationCondition.class);
        ConfirmedRecommendationCondition confirmed = confirm(extracted.condition());

        RecommendationCoreResult result = fixture.core.recommend(confirmed);

        assertThat(result.places()).hasSize(3);
        assertThat(result.reasonFallback()).isFalse();
        assertThat(result.degraded()).isFalse();
        assertThat(result.providerCalls()).isEqualTo(7);
        assertThat(fixture.extractionCalls.get() + result.providerCalls()).isEqualTo(8);
        assertThat(fixture.placePort.queries).hasSize(1);
        assertThat(fixture.blogPort.queries).hasSize(5);
        assertThat(fixture.reasonPort.calls.get()).isEqualTo(1);
        assertConfirmedOnlyBoundary();
    }

    @Test
    void onePreferenceRelaxationRaisesTheLinkedCallCeilingToNine() {
        WorkflowFixture fixture = fixture(List.of(
            places(1, 2),
            places(3, 5)
        ));
        ExtractionOutcome extracted = fixture.extractionPort.extract(extractionCommand());

        RecommendationCoreResult result = fixture.core.recommend(confirm(extracted.condition()));

        assertThat(result.relaxed()).isTrue();
        assertThat(result.placeSearchCalls()).isEqualTo(2);
        assertThat(result.blogSearchCalls()).isEqualTo(5);
        assertThat(result.providerCalls()).isEqualTo(8);
        assertThat(fixture.extractionCalls.get() + result.providerCalls()).isEqualTo(9);
        assertThat(fixture.placePort.queries).hasSize(2);
        assertThat(fixture.reasonPort.calls.get()).isEqualTo(1);
    }

    private static void assertConfirmedOnlyBoundary() throws Exception {
        Method method = RecommendationCoreUseCase.class.getMethod(
            "recommend",
            ConfirmedRecommendationCondition.class
        );
        assertThat(method.getParameterTypes()).containsExactly(ConfirmedRecommendationCondition.class);
        assertThat(java.util.Arrays.stream(RecommendationCoreUseCase.class.getMethods())
            .filter(value -> value.getName().equals("recommend")))
            .singleElement()
            .satisfies(value -> assertThat(value.getParameterTypes())
                .doesNotContain(DraftRecommendationCondition.class));
    }

    private WorkflowFixture fixture(List<List<PlaceSearchItem>> localResponses) {
        AtomicInteger extractionCalls = new AtomicInteger();
        DeterministicConditionExtractionAdapter extraction =
            new DeterministicConditionExtractionAdapter();
        ConditionExtractionPort extractionPort = command -> {
            extractionCalls.incrementAndGet();
            return extraction.extract(command);
        };
        RecordingPlacePort placePort = new RecordingPlacePort(localResponses);
        RecordingBlogPort blogPort = new RecordingBlogPort();
        RecordingReasonPort reasonPort = new RecordingReasonPort();
        CategoryTaxonomy taxonomy = new CategoryTaxonomy();
        CandidateRankingService ranking = new CandidateRankingService(
            placePort,
            blogPort,
            new CandidateQueryPlanner(taxonomy),
            new CandidateNormalizer(taxonomy, new LocationMatcher()),
            new CandidateRanker(new CandidateScoringPolicy()),
            uuidSupplier()
        );
        RecommendationCoreUseCase core = new RecommendationCoreUseCase(
            ranking,
            new GroundedReasonService(reasonPort)
        );
        return new WorkflowFixture(
            extractionPort,
            extractionCalls,
            placePort,
            blogPort,
            reasonPort,
            core
        );
    }

    private ExtractionCommand extractionCommand() {
        return new ExtractionCommand(
            "서울 강남구에서 4명이 조용한 주차 카페를 1만원~3만원으로 찾고 흡연 제외",
            "synthetic-session-confirmation-0001"
        );
    }

    private ConfirmedRecommendationCondition confirm(DraftRecommendationCondition draft) {
        return new ConfirmedRecommendationCondition(
            draft.locationQuery(),
            draft.placeType(),
            draft.placeTypeDetail(),
            draft.partySize(),
            draft.budgetPerPersonMin(),
            draft.budgetPerPersonMax(),
            draft.preferences(),
            draft.exclusions()
        );
    }

    private static List<PlaceSearchItem> places(int start, int end) {
        return java.util.stream.IntStream.rangeClosed(start, end)
            .mapToObj(index -> new PlaceSearchItem(
                "카페 " + index,
                "https://place.test/" + index,
                "카페>디저트",
                index % 2 == 0 ? "조용한 주차" : "조용한 공간",
                "서울특별시 강남구 테헤란로 " + index,
                "서울특별시 강남구 테헤란로 " + index,
                "",
                ""
            ))
            .toList();
    }

    private Supplier<UUID> uuidSupplier() {
        Iterator<UUID> values = List.of(
            UUID.fromString("00000000-0000-4000-8000-000000000001"),
            UUID.fromString("00000000-0000-4000-8000-000000000002"),
            UUID.fromString("00000000-0000-4000-8000-000000000003")
        ).iterator();
        return values::next;
    }

    private static final class RecordingPlacePort implements PlaceSearchPort {
        private final List<List<PlaceSearchItem>> responses;
        private final List<PlaceSearchQuery> queries = new ArrayList<>();

        private RecordingPlacePort(List<List<PlaceSearchItem>> responses) {
            this.responses = responses;
        }

        @Override
        public PlaceSearchResult searchPlaces(PlaceSearchQuery query) {
            int index = queries.size();
            queries.add(query);
            List<PlaceSearchItem> items = responses.get(index);
            return new PlaceSearchResult(items.size(), items);
        }
    }

    private static final class RecordingBlogPort implements BlogSearchPort {
        private final List<BlogSearchQuery> queries = new ArrayList<>();

        @Override
        public BlogSearchResult searchBlogs(BlogSearchQuery query) {
            queries.add(query);
            String name = query.query().substring(0, query.query().indexOf(" 서울"));
            return new BlogSearchResult(1, List.of(new BlogSearchItem(
                name + " 방문 기록",
                "https://blog.test/" + queries.size(),
                name + " 조용한 공간",
                "작성자",
                "",
                "20260715"
            )));
        }
    }

    private static final class RecordingReasonPort implements GroundedReasonGenerationPort {
        private final AtomicInteger calls = new AtomicInteger();

        @Override
        public ReasonGenerationOutcome generate(ReasonGenerationCommand command) {
            calls.incrementAndGet();
            return ReasonGenerationOutcome.generated(new GeneratedReasonBatch(
                GeneratedReasonBatch.SCHEMA_VERSION,
                command.places().stream().map(place -> new PlaceReasonStatements(
                    place.placeId(),
                    List.of(new ReasonStatement(
                        place.name() + " 검색 후보",
                        List.of(place.evidence().get(0).evidenceId())
                    ))
                )).toList()
            ));
        }
    }

    private record WorkflowFixture(
        ConditionExtractionPort extractionPort,
        AtomicInteger extractionCalls,
        RecordingPlacePort placePort,
        RecordingBlogPort blogPort,
        RecordingReasonPort reasonPort,
        RecommendationCoreUseCase core
    ) {
    }
}

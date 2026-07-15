package com.placepick.recommendation.application.candidate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.condition.domain.PlaceType;
import com.placepick.recommendation.condition.domain.Preference;
import java.util.List;
import org.junit.jupiter.api.Test;

class CandidateQueryPlannerTest {

    private final CandidateQueryPlanner planner = new CandidateQueryPlanner(new CategoryTaxonomy());

    @Test
    void ordersPreferencesByPriorityThenOriginalOrderWithoutSplittingTokens() {
        ConfirmedRecommendationCondition condition = condition(
            "서울 강남구",
            List.of(
                new Preference("조용한 좌석", 5),
                new Preference("디저트", 10),
                new Preference("주차 가능", 5)
            )
        );

        CandidateQueryPlan plan = planner.initial(condition);

        assertThat(plan.query()).isEqualTo("서울 강남구 카페 디저트 조용한 좌석 주차 가능");
        assertThat(plan.includedPreferences())
            .extracting(value -> value.preference().value())
            .containsExactly("디저트", "조용한 좌석", "주차 가능");
    }

    @Test
    void keepsTheQueryAtTheBoundaryAndSkipsAnEntirePreferenceThatDoesNotFit() {
        String location = "가".repeat(95);
        ConfirmedRecommendationCondition condition = condition(
            location,
            List.of(new Preference("긴 선호", 10), new Preference("나", 9))
        );

        CandidateQueryPlan plan = planner.initial(condition);

        assertThat(plan.query()).hasSize(100).endsWith("카페 나");
        assertThat(plan.query()).doesNotContain("긴 선호");
        assertThat(plan.includedPreferences()).singleElement()
            .extracting(value -> value.preference().value())
            .isEqualTo("나");
    }

    @Test
    void rejectsRequiredTokensThatCannotFitInsteadOfSilentlyTruncatingThem() {
        ConfirmedRecommendationCondition condition = condition("가".repeat(100), List.of());

        assertThatThrownBy(() -> planner.initial(condition))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("required place type");
    }

    @Test
    void countsUnicodeCodePointsRatherThanUtf16CodeUnitsAtTheProviderBoundary() {
        String supplementaryCharacter = new String(Character.toChars(0x20000));
        ConfirmedRecommendationCondition condition = condition(
            supplementaryCharacter.repeat(95),
            List.of(new Preference("나", 10))
        );

        CandidateQueryPlan plan = planner.initial(condition);

        assertThat(plan.query().codePointCount(0, plan.query().length())).isEqualTo(100);
        assertThat(plan.query()).endsWith("카페 나");
    }

    @Test
    void relaxesOnlyTheLastOriginalPreferenceAmongTheLowestIncludedPriority() {
        ConfirmedRecommendationCondition condition = condition(
            "서울",
            List.of(
                new Preference("창가", 3),
                new Preference("조용함", 8),
                new Preference("주차", 3)
            )
        );

        CandidateQueryPlan relaxed = planner.relax(planner.initial(condition)).orElseThrow();

        assertThat(relaxed.query()).isEqualTo("서울 카페 조용함 창가");
        assertThat(relaxed.includedPreferences())
            .extracting(value -> value.preference().value())
            .containsExactly("조용함", "창가");
    }

    private ConfirmedRecommendationCondition condition(
        String location,
        List<Preference> preferences
    ) {
        return new ConfirmedRecommendationCondition(
            location,
            PlaceType.CAFE,
            null,
            null,
            null,
            null,
            preferences,
            List.of()
        );
    }
}

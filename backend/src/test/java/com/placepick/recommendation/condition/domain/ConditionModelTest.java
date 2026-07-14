package com.placepick.recommendation.condition.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ConditionModelTest {

    @Test
    void draftAllowsUnknownOptionalValuesButNormalizesAndDeduplicatesLists() {
        DraftRecommendationCondition draft = new DraftRecommendationCondition(
            "  서울 성수동  ",
            PlaceType.CAFE,
            null,
            null,
            null,
            null,
            List.of(new Preference(" 조용한 ", null), new Preference("조용한", null)),
            List.of("흡연", " 흡연 ")
        );

        assertThat(draft.locationQuery()).isEqualTo("서울 성수동");
        assertThat(draft.partySize()).isNull();
        assertThat(draft.preferences()).containsExactly(new Preference("조용한", null));
        assertThat(draft.exclusions()).containsExactly("흡연");
        assertThat(draft.isProcessable()).isTrue();
    }

    @Test
    void draftMayRepresentAnUnprocessableMissingLocationOrType() {
        DraftRecommendationCondition draft = new DraftRecommendationCondition(
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(),
            List.of()
        );

        assertThat(draft.isProcessable()).isFalse();
        assertThatThrownBy(draft::confirm)
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Confirmed condition requires a location query and place type.");
    }

    @Test
    void confirmedConditionRequiresEveryPreferencePriority() {
        assertThatThrownBy(() -> confirmed(List.of(new Preference("조용한", null))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Confirmed condition requires every preference priority.");

        assertThatCode(() -> confirmed(List.of(new Preference("조용한", 10))))
            .doesNotThrowAnyException();
    }

    @Test
    void enforcesPartyBudgetAndCrossFieldBoundaries() {
        assertThatCode(() -> new DraftRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            null,
            100,
            0,
            10_000_000,
            List.of(),
            List.of()
        )).doesNotThrowAnyException();

        assertThatThrownBy(() -> draftWith(101, 0, 1))
            .hasMessage("Party size must be between 1 and 100.");
        assertThatThrownBy(() -> draftWith(1, -1, 1))
            .hasMessage("Minimum budget must be between 0 and 10000000.");
        assertThatThrownBy(() -> draftWith(1, 2, 1))
            .hasMessage("Minimum budget must not be greater than maximum budget.");
    }

    @Test
    void otherRequiresDetailAndOtherTypesForbidIt() {
        assertThatThrownBy(() -> new DraftRecommendationCondition(
            "서울",
            PlaceType.OTHER,
            null,
            null,
            null,
            null,
            List.of(),
            List.of()
        )).hasMessage("Other place type requires place type detail.");

        assertThatThrownBy(() -> new DraftRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            "베이커리",
            null,
            null,
            null,
            List.of(),
            List.of()
        )).hasMessage("Place type detail is only allowed for OTHER.");
    }

    @Test
    void rejectsMoreThanTenItemsBeforeDeduplication() {
        List<Preference> preferences = IntStream.range(0, 11)
            .mapToObj(index -> new Preference("같은 선호", 5))
            .toList();

        assertThatThrownBy(() -> new DraftRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            null,
            null,
            null,
            null,
            preferences,
            List.of()
        )).hasMessage("Preferences must not contain more than 10 items.");
    }

    private static ConfirmedRecommendationCondition confirmed(List<Preference> preferences) {
        return new ConfirmedRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            null,
            null,
            null,
            null,
            preferences,
            List.of()
        );
    }

    private static DraftRecommendationCondition draftWith(
        Integer partySize,
        Integer minimum,
        Integer maximum
    ) {
        return new DraftRecommendationCondition(
            "서울",
            PlaceType.CAFE,
            null,
            partySize,
            minimum,
            maximum,
            List.of(),
            List.of()
        );
    }
}

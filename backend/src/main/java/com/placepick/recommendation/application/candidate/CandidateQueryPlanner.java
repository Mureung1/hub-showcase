package com.placepick.recommendation.application.candidate;

import com.placepick.recommendation.condition.domain.ConfirmedRecommendationCondition;
import com.placepick.recommendation.condition.domain.Preference;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class CandidateQueryPlanner {

    private static final int MAX_QUERY_LENGTH = 100;

    private final CategoryTaxonomy taxonomy;

    public CandidateQueryPlanner(CategoryTaxonomy taxonomy) {
        this.taxonomy = taxonomy;
    }

    public CandidateQueryPlan initial(ConfirmedRecommendationCondition condition) {
        List<String> tokens = new ArrayList<>();
        tokens.add(SearchTextNormalizer.display(condition.locationQuery()));
        tokens.add(taxonomy.queryToken(condition.placeType(), condition.placeTypeDetail()));
        String base = String.join(" ", tokens);
        if (length(base) > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException(
                "Location and required place type exceed the provider query limit."
            );
        }

        List<IncludedPreference> ordered = new ArrayList<>();
        for (int index = 0; index < condition.preferences().size(); index++) {
            ordered.add(new IncludedPreference(condition.preferences().get(index), index));
        }
        ordered.sort(Comparator
            .comparingInt((IncludedPreference value) -> value.preference().priority()).reversed()
            .thenComparingInt(IncludedPreference::originalIndex));

        List<IncludedPreference> included = new ArrayList<>();
        for (IncludedPreference candidate : ordered) {
            String token = SearchTextNormalizer.display(candidate.preference().value());
            if (!token.isBlank() && appendLength(tokens, token) <= MAX_QUERY_LENGTH) {
                tokens.add(token);
                included.add(candidate);
            }
        }
        return new CandidateQueryPlan(String.join(" ", tokens), included);
    }

    public Optional<CandidateQueryPlan> relax(CandidateQueryPlan initial) {
        Optional<IncludedPreference> removable = initial.includedPreferences().stream()
            .min(Comparator
                .comparingInt((IncludedPreference value) -> value.preference().priority())
                .thenComparing(Comparator.comparingInt(IncludedPreference::originalIndex).reversed()));
        if (removable.isEmpty()) {
            return Optional.empty();
        }
        IncludedPreference removed = removable.orElseThrow();
        List<IncludedPreference> remaining = initial.includedPreferences().stream()
            .filter(value -> value.originalIndex() != removed.originalIndex())
            .toList();

        String removedToken = SearchTextNormalizer.display(removed.preference().value());
        List<String> queryTokens = new ArrayList<>(List.of(initial.query().split(" ")));
        removeLastSequence(queryTokens, List.of(removedToken.split(" ")));
        return Optional.of(new CandidateQueryPlan(String.join(" ", queryTokens), remaining));
    }

    public String blogQuery(String candidateName, String locationQuery) {
        String query = SearchTextNormalizer.display(candidateName) + " "
            + SearchTextNormalizer.display(locationQuery);
        if (length(query) > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException("Candidate and location exceed the provider query limit.");
        }
        return query;
    }

    private int appendLength(List<String> existing, String candidate) {
        return length(String.join(" ", existing)) + 1 + length(candidate);
    }

    private int length(String value) {
        return value.codePointCount(0, value.length());
    }

    private void removeLastSequence(List<String> source, List<String> sequence) {
        for (int start = source.size() - sequence.size(); start >= 0; start--) {
            if (source.subList(start, start + sequence.size()).equals(sequence)) {
                source.subList(start, start + sequence.size()).clear();
                return;
            }
        }
        throw new IllegalStateException("Included preference token must be present in its query.");
    }
}

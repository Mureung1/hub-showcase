package com.placepick.recommendation.reason.application;

import com.placepick.recommendation.reason.application.port.out.ReasonGenerationCommand;
import com.placepick.recommendation.reason.domain.GeneratedReasonBatch;
import com.placepick.recommendation.reason.domain.PlaceReasonStatements;
import com.placepick.recommendation.reason.domain.ReasonPlaceContext;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

final class ReasonBatchValidator {

    private final ReasonStatementPolicy statementPolicy;

    ReasonBatchValidator(ReasonStatementPolicy statementPolicy) {
        this.statementPolicy = statementPolicy;
    }

    List<PlaceReasonStatements> validateAndOrder(
        ReasonGenerationCommand command,
        GeneratedReasonBatch batch
    ) {
        if (!GeneratedReasonBatch.SCHEMA_VERSION.equals(batch.schemaVersion()) ||
            batch.places().size() != 3) {
            throw new IllegalArgumentException("Reason batch schema or size is invalid.");
        }

        Map<UUID, ReasonPlaceContext> expected = new HashMap<>();
        command.places().forEach(value -> expected.put(value.placeId(), value));
        Map<UUID, PlaceReasonStatements> actual = new HashMap<>();
        for (PlaceReasonStatements place : batch.places()) {
            if (!expected.containsKey(place.placeId()) || actual.put(place.placeId(), place) != null) {
                throw new IllegalArgumentException("Reason batch place IDs are invalid.");
            }
            Set<String> statementTexts = new HashSet<>();
            for (var statement : place.statements()) {
                if (!statementTexts.add(statement.text()) ||
                    !statementPolicy.isSupported(statement, expected.get(place.placeId()))) {
                    throw new IllegalArgumentException("Reason statement is not grounded.");
                }
            }
        }
        if (!actual.keySet().equals(expected.keySet())) {
            throw new IllegalArgumentException("Reason batch place set is incomplete.");
        }
        return command.places().stream().map(value -> actual.get(value.placeId())).toList();
    }
}

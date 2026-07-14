package com.placepick.recommendation.reason.application;

import com.placepick.recommendation.application.candidate.SearchTextNormalizer;
import com.placepick.recommendation.domain.candidate.CandidateEvidence;
import com.placepick.recommendation.domain.scoring.RankedPlace;
import com.placepick.recommendation.reason.domain.ReasonEvidence;
import com.placepick.recommendation.reason.domain.ReasonEvidenceType;
import com.placepick.recommendation.reason.domain.ReasonPlaceContext;
import java.util.ArrayList;
import java.util.List;

final class ReasonContextFactory {

    private static final int MAX_TITLE = 200;
    private static final int MAX_SUMMARY = 500;

    ReasonPlaceContext create(RankedPlace place) {
        List<ReasonEvidence> evidence = new ArrayList<>();
        evidence.add(new ReasonEvidence(
            localEvidenceId(place),
            ReasonEvidenceType.LOCAL,
            bounded(place.candidate().name(), MAX_TITLE),
            bounded(String.join(
                " ",
                place.candidate().category(),
                place.candidate().description(),
                place.candidate().roadAddress(),
                place.candidate().address()
            ), MAX_SUMMARY)
        ));
        place.evidence().stream().limit(3).map(this::blogEvidence).forEach(evidence::add);
        return new ReasonPlaceContext(
            place.placeId(),
            bounded(place.candidate().name(), MAX_TITLE),
            bounded(place.candidate().category(), MAX_TITLE),
            evidence
        );
    }

    static String localEvidenceId(RankedPlace place) {
        return "local:" + place.placeId();
    }

    private ReasonEvidence blogEvidence(CandidateEvidence source) {
        return new ReasonEvidence(
            source.evidenceId(),
            ReasonEvidenceType.BLOG,
            bounded(source.title(), MAX_TITLE),
            bounded(source.summary(), MAX_SUMMARY)
        );
    }

    private static String bounded(String source, int maximum) {
        String value = SearchTextNormalizer.display(source);
        int codePoints = value.codePointCount(0, value.length());
        if (codePoints <= maximum) {
            return value;
        }
        return value.substring(0, value.offsetByCodePoints(0, maximum));
    }
}

package com.placepick.recommendation.reason.application;

import com.placepick.recommendation.application.candidate.SearchTextNormalizer;
import com.placepick.recommendation.reason.domain.ReasonEvidence;
import com.placepick.recommendation.reason.domain.ReasonPlaceContext;
import com.placepick.recommendation.reason.domain.ReasonStatement;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Deterministic post-validation applied after strict JSON parsing. */
public final class ReasonStatementPolicy {

    private static final Pattern TOKEN = Pattern.compile("[\\p{L}\\p{N}]{2,}");
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)*");
    private static final Pattern FORBIDDEN = Pattern.compile(
        "(?iu)(?:\\d[\\d,.]*\\s*(?:원|만원|천원|krw)|가격|예산|비용|" +
            "영업|운영\\s*시간|오픈|마감|휴무|도보|걸어서|출구|지하철|" +
            "점수|순위|\\d+\\s*위|최고|최적|보장|반드시|무조건|완벽|확실(?:히)?|" +
            "저렴|비싸|가성비|무료|24\\s*시간|연중무휴|" +
            "이전\\s*지시|지시를\\s*무시|ignore\\s+previous|<script|javascript:)"
    );
    private static final Set<String> EVIDENCE_REQUIRED_CLAIMS = Set.of(
        "조용", "분위기", "맛", "친절", "넓", "주차", "뷰", "반려", "채식",
        "유명", "인기", "가깝", "역세권", "혼잡", "웨이팅", "좌석", "수용", "인원"
    );

    public boolean isSupported(
        ReasonStatement statement,
        ReasonPlaceContext place
    ) {
        String normalizedText = SearchTextNormalizer.comparison(statement.text());
        if (FORBIDDEN.matcher(normalizedText).find()) {
            return false;
        }

        Map<String, ReasonEvidence> evidenceById = new HashMap<>();
        place.evidence().forEach(value -> evidenceById.put(value.evidenceId(), value));
        StringBuilder allReferencedText = new StringBuilder();
        for (String evidenceId : statement.evidenceIds()) {
            ReasonEvidence evidence = evidenceById.get(evidenceId);
            if (evidence == null) {
                return false;
            }
            String evidenceText = SearchTextNormalizer.comparison(
                evidence.title() + " " + evidence.summary()
            );
            if (!sharesEvidenceToken(normalizedText, evidenceText)) {
                return false;
            }
            allReferencedText.append(' ').append(evidenceText);
        }

        String referencedText = allReferencedText.toString();
        if (!numbersAreGrounded(normalizedText, referencedText)) {
            return false;
        }
        return EVIDENCE_REQUIRED_CLAIMS.stream().noneMatch(claim ->
            normalizedText.contains(claim) && !referencedText.contains(claim)
        );
    }

    private static boolean sharesEvidenceToken(String statement, String evidence) {
        Set<String> evidenceTokens = tokens(evidence);
        return tokens(statement).stream().anyMatch(evidenceTokens::contains);
    }

    private static Set<String> tokens(String value) {
        Set<String> tokens = new HashSet<>();
        Matcher matcher = TOKEN.matcher(value);
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        return tokens;
    }

    private static boolean numbersAreGrounded(String statement, String evidence) {
        Set<String> evidenceNumbers = new HashSet<>();
        Matcher evidenceMatcher = NUMBER.matcher(evidence);
        while (evidenceMatcher.find()) {
            evidenceNumbers.add(evidenceMatcher.group());
        }
        Matcher matcher = NUMBER.matcher(statement);
        while (matcher.find()) {
            if (!evidenceNumbers.contains(matcher.group())) {
                return false;
            }
        }
        return true;
    }
}

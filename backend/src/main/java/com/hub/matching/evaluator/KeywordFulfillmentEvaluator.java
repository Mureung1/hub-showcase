package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * ── 역할 변경 ─────────────────────────────────────
 * 이전: @Primary — 모든 요구조건을 이 구현체가 처리
 * 이후: UNCLASSIFIED 전용 폴백 — 타입 추출에 실패한 것만 처리
 * ─────────────────────────────────────────────
 *
 * @Primary 는 제거했다. 타입이 정상 추출되면 이 클래스는 호출되지 않는다.
 * 여기로 오는 요구조건 비율 자체가 추출 품질 지표다 (높으면 사전·프롬프트를 고쳐야 한다).
 */
@Component
public class KeywordFulfillmentEvaluator implements FulfillmentEvaluator {

    private static final BigDecimal PARTIAL = new BigDecimal("0.500");

    @Override
    public RequirementType supports() { return RequirementType.UNCLASSIFIED; }

    @Override
    public Result evaluate(JobRequirement requirement, List<Credential> credentials) {
        String[] tokens = requirement.getName().toLowerCase(Locale.ROOT).split("[\\s/,·]+");

        for (Credential credential : credentials) {
            String haystack = (credential.getTitle() + " " + credential.getDetail())
                    .toLowerCase(Locale.ROOT);

            long hits = Arrays.stream(tokens)
                    .filter(t -> t.length() > 1 && haystack.contains(t))
                    .count();

            if (hits >= 2) return Result.met(credential.getTitle());
            if (hits == 1) return Result.of(PARTIAL, credential.getTitle(), "부분 일치 (타입 미분류)");
        }
        return Result.none("해당 이력 없음");
    }
}

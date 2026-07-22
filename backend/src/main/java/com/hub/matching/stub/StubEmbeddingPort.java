package com.hub.matching.stub;

import com.hub.matching.EmbeddingPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * 로컬 개발용 EmbeddingPort.
 *
 * 실제 pgvector 임베딩 대신 토큰 겹침(자카드 유사도)으로 흉내낸다.
 * LLM/임베딩 키 없이도 매칭 순위가 "대략 맞는지"(2주차 목표) 확인할 수 있다.
 * 3주차에 진짜 pgvector 구현으로 교체한다. 반환은 0~1.
 */
@Component
@Profile("local")
public class StubEmbeddingPort implements EmbeddingPort {

    @Override
    public BigDecimal similarity(String requirementText, String credentialText) {
        Set<String> a = tokens(requirementText);
        Set<String> b = tokens(credentialText);
        if (a.isEmpty() || b.isEmpty()) return BigDecimal.ZERO;

        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);

        return BigDecimal.valueOf(intersection.size())
                .divide(BigDecimal.valueOf(union.size()), MathContext.DECIMAL64);
    }

    private Set<String> tokens(String s) {
        if (s == null) return Set.of();
        Set<String> out = new HashSet<>();
        for (String t : s.toLowerCase(Locale.ROOT).split("[\\s/,·()\\[\\]]+")) {
            if (t.length() > 1) out.add(t);
        }
        return out;
    }
}

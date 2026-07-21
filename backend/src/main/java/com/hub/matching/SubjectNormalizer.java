package com.hub.matching;

import java.util.Optional;

/**
 * "파이썬 / Python / Py3" 가 같은 ID 로 모이지 않으면 이후 계산이 전부 흔들린다.
 * 사전 → 임베딩 최근접(0.85) → 미분류 큐 순으로 폴백한다.
 */
public interface SubjectNormalizer {

    double NEAREST_THRESHOLD = 0.85;

    Optional<String> normalize(String rawTerm);
}

package com.hub.matching;

import java.math.BigDecimal;

/**
 * pgvector 코사인 유사도. 캐시 키는 정규화 텍스트 해시.
 * 2주차 EmbeddingFulfillmentEvaluator 계획이 이 포트로 흡수됐다.
 */
public interface EmbeddingPort {

    /** 0~1 */
    BigDecimal similarity(String requirementText, String credentialText);
}

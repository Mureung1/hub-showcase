package com.hub.position;

/**
 * 요구조건 타입. 타입별로 다른 FulfillmentEvaluator 가 선택된다.
 * SOFT 만 LLM 판정 대상이며 나머지는 결정론적으로 계산한다.
 */
public enum RequirementType {
    EXPERIENCE_YEARS,
    SKILL_USE,
    CERTIFICATION,
    DOMAIN,
    SOFT,
    /** 타입 추출 실패. KeywordFulfillmentEvaluator 폴백 */
    UNCLASSIFIED
}

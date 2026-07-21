package com.hub.matching;

/** @param evidence 이력 원문에서 발췌한 근거. 발췌 실패 시 null → 자동으로 0.3 캡 */
public record SoftJudgement(SoftGrade grade, String evidence, String reason) {}

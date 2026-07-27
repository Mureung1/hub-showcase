package com.punchman.devpulse.normalizer;

/**
 * 룰 기반 최소 정규화 — 자격증명이 주어진 텍스트에 단순 포함(contains)되는지만 검사한다.
 * 동의어/표기 변형("컴활1급" 등) 처리는 하지 않음 — LLM 정규화 에이전트(FR-2)의 몫으로 남겨둔다.
 */
public final class CertificationTextMatcher {

    private CertificationTextMatcher() {
    }

    public static boolean mentions(String certificationName, String... texts) {
        if (certificationName == null || certificationName.isBlank()) {
            return false;
        }
        for (String text : texts) {
            if (text != null && text.contains(certificationName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * ALIO가 이미 분리해 내려주는 자격요건(qualificationText)/우대사항(preferenceText) 필드를
     * 그대로 신호로 쓴다 — 자유 텍스트에서 "필수"/"우대" 키워드를 찾는 것보다 신뢰도가 높다.
     * 두 필드 모두에 매칭되는 경우 qualificationText가 우선(자격요건란에 적혔다는 사실 자체가
     * 더 강한 신호) — mentionCount = essential + preferred가 항상 성립해 이중 집계를 피한다.
     */
    public static MentionField classify(String certificationName, String qualificationText, String preferenceText) {
        if (certificationName == null || certificationName.isBlank()) {
            return MentionField.NONE;
        }
        if (qualificationText != null && qualificationText.contains(certificationName)) {
            return MentionField.QUALIFICATION;
        }
        if (preferenceText != null && preferenceText.contains(certificationName)) {
            return MentionField.PREFERENCE;
        }
        return MentionField.NONE;
    }

    public enum MentionField {
        QUALIFICATION, PREFERENCE, NONE
    }
}

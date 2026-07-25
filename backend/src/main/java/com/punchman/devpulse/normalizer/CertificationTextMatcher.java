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
}

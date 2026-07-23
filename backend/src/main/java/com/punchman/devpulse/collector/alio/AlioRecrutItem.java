package com.punchman.devpulse.collector.alio;

/**
 * ALIO 채용정보 응답의 개별 공고 항목. 필드명은 ALIO 원문 그대로 유지한다(Jackson 기본 바인딩 단순화).
 */
public record AlioRecrutItem(
        Long recrutPblntSn,
        String recrutPbancTtl,
        String instNm,
        String aplyQlfcCn,
        String prefCondCn,
        String prefCn,
        String ncsCdNmLst,
        String ongoingYn,
        String pbancBgngYmd,
        String pbancEndYmd
) {
}

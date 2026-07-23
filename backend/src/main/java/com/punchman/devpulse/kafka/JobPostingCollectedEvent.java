package com.punchman.devpulse.kafka;

public record JobPostingCollectedEvent(
        String jobTitle,
        String recrutPblntSn,
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

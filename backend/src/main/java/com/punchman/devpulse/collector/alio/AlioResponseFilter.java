package com.punchman.devpulse.collector.alio;

import java.time.LocalDate;

/**
 * ALIO 요청 파라미터(ongoingYn, pbancBgngYmd/pbancEndYmd)로도 필터가 되지만,
 * 파라미터명이 실제로 그렇게 동작하는지 확인 전이라 응답을 받은 뒤 한 번 더 방어적으로 걸러낸다.
 */
public final class AlioResponseFilter {

    private AlioResponseFilter() {
    }

    public static boolean isCollectable(AlioRecrutItem item, LocalDate today, long recentMonths) {
        if (!"Y".equals(item.ongoingYn())) {
            return false;
        }
        LocalDate startDate = AlioDateParser.parse(item.pbancBgngYmd());
        if (startDate == null) {
            return false;
        }
        LocalDate cutoff = today.minusMonths(recentMonths);
        return !startDate.isBefore(cutoff);
    }
}

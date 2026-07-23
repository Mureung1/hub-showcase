package com.punchman.devpulse.collector.alio;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;

/**
 * ALIO 응답의 pbancBgngYmd/pbancEndYmd(yyyyMMdd, 구분자 없는 8자리) 전용 파서.
 * 형식이 예상과 다르면(구분자 혼입 등) 관대하게 흡수하지 않고 null로 실패시켜
 * 실제 포맷이 바뀌었을 때 조용히 넘어가지 않고 드러나게 한다.
 * STRICT 리졸버를 명시하지 않으면 기본 SMART 리졸버가 2월 31일 같은 잘못된 날짜를
 * 조용히 2월 28일로 보정해버려서, 존재하지 않는 날짜를 실패로 잡아내지 못한다.
 * 연도 패턴은 소문자 'y'(연호 기반 YearOfEra)가 아니라 'u'(서력 연산 Year)를 쓴다 —
 * STRICT 모드에서 'y'는 시대(era) 필드가 패턴에 없으면 연호를 확정 못 해 정상 날짜도 파싱 실패한다.
 */
public final class AlioDateParser {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("uuuuMMdd")
            .withResolverStyle(ResolverStyle.STRICT);

    private AlioDateParser() {
    }

    public static LocalDate parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value, DATE_FORMAT);
        } catch (Exception e) {
            return null;
        }
    }
}

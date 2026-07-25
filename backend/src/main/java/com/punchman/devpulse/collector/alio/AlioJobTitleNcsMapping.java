package com.punchman.devpulse.collector.alio;

import java.util.List;
import java.util.Map;

/**
 * 목표 직무명 -> NCS 대분류 코드(ncsCdLst) 매핑. recrutPbancTtl(제목) 검색은 문구가 실제 공고
 * 제목에 리터럴로 존재해야만 매칭되는 구조적 한계가 있어(실측: "반도체 품질관리"/"전산직" 대부분
 * 0~1건), NCS 코드값을 실제 ALIO 엔드포인트로 직접 검증해 대체했다(요청에 넣은 코드와 응답
 * ncsCdNmLst에 포함된 분류명이 일치함을 확인: R600020=정보통신, R600019=전기·전자,
 * R600016=재료, R600017=화학). "품질관리"처럼 NCS 대분류(산업분야 단위)에 없는 직무 기능은
 * 인접 산업분야 코드를 복수로 묶어 커버한다.
 *
 * 매핑에 없는 jobTitle은 빈 리스트를 반환하며, 호출부는 이를 기존 제목 검색으로의 폴백 신호로
 * 쓴다.
 */
public final class AlioJobTitleNcsMapping {

    private static final Map<String, List<String>> MAPPING = Map.of(
            "전산직", List.of("R600020"),
            "반도체 품질관리", List.of("R600019", "R600016", "R600017")
    );

    private AlioJobTitleNcsMapping() {
    }

    public static List<String> codesFor(String jobTitle) {
        return MAPPING.getOrDefault(jobTitle, List.of());
    }
}

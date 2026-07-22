package com.hub.matching.stub;

import com.hub.matching.SubstitutionTable;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * 로컬 개발용 SubstitutionTable.
 *
 * 상위 자격 대체 규칙을 하드코딩한다 (V1 subject_substitutions 시드와 동일).
 * 정보관리기술사 보유 → 정보처리기사 요구 충족, 석사 → 학사 요구 충족 등.
 * 실제 구현은 subject_substitutions 테이블을 조회한다.
 */
@Component
@Profile("local")
public class StubSubstitutionTable implements SubstitutionTable {

    /** held(보유) → 이 자격이 충족시키는 required(요구) 집합 */
    private static final Map<String, Set<String>> RULES = Map.of(
            "ipe-master", Set.of("ipe"),
            "master",     Set.of("bachelor"),
            "doctor",     Set.of("master", "bachelor")
    );

    @Override
    public boolean satisfies(String held, String required) {
        if (held == null || required == null) return false;
        return RULES.getOrDefault(held, Set.of()).contains(required);
    }
}

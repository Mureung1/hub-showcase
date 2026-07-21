package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobRequirement;

import java.util.List;

/**
 * 계산 불가능한 서술형 조건만 LLM 에 위임한다.
 *
 * 구현 제약:
 *  - temperature = 0
 *  - 조건 하나씩 독립 호출 (한 번에 여러 개 물으면 서로 영향을 준다)
 *  - 근거 발췌 실패 시 INDIRECT 를 넘길 수 없다
 *
 * 로컬에서는 StubSoftJudge(@Profile("local")) 로 대체해 LLM 키 없이 전체 흐름 확인.
 */
public interface SoftJudge {

    SoftJudgement judge(JobRequirement requirement, List<Credential> credentials);
}

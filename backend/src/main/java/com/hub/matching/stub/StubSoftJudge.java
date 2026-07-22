package com.hub.matching.stub;

import com.hub.credential.Credential;
import com.hub.matching.SoftGrade;
import com.hub.matching.SoftJudge;
import com.hub.matching.SoftJudgement;
import com.hub.position.JobRequirement;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 로컬 개발용 SoftJudge.
 *
 * 서술형(SOFT) 요구조건은 LLM 판정 영역이라, 붙이기 전까지는
 * 근거 없이 NONE 으로 둔다 (기획서 4.2 의 "팀 리딩 경험 = 0.0" 과 동일한 취급).
 * 억지로 점수를 만들지 않는 편이 순위를 덜 왜곡한다.
 * 3주차에 temperature=0 · 조건 독립 호출의 실제 SoftJudge 로 교체한다.
 */
@Component
@Profile("local")
public class StubSoftJudge implements SoftJudge {

    @Override
    public SoftJudgement judge(JobRequirement requirement, List<Credential> credentials) {
        return new SoftJudgement(SoftGrade.NONE, null, "LLM 판정 미연결 (로컬 stub)");
    }
}

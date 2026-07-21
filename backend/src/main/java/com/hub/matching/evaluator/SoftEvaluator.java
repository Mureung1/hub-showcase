package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.matching.SoftJudge;
import com.hub.matching.SoftJudgement;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 유일한 LLM 판정 경로. 전체 요구조건의 15~25% 만 여기로 와야 한다.
 * 근거를 제시하지 못하면 Result 생성자가 0.3 으로 자동 캡한다.
 */
@Component
@RequiredArgsConstructor
public class SoftEvaluator implements FulfillmentEvaluator {

    private final SoftJudge judge;

    @Override
    public RequirementType supports() { return RequirementType.SOFT; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        SoftJudgement j = judge.judge(req, credentials);
        return Result.of(j.grade().value(), j.evidence(), j.reason());
    }
}

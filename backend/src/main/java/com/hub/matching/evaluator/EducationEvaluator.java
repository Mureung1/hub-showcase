package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.credential.CredentialType;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.matching.SubstitutionTable;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/** 학사 요구 + 석사 보유 → 1.0 */
@Component
@RequiredArgsConstructor
public class EducationEvaluator implements FulfillmentEvaluator {

    private final SubstitutionTable substitution;

    @Override
    public RequirementType supports() { return RequirementType.EDUCATION; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        if (req.getSubject() == null) return Result.none("요구 학력 미분류");

        for (Credential c : credentials) {
            if (c.getType() != CredentialType.EDUCATION) continue;
            if (req.getSubject().equals(c.getSubject())
                    || substitution.satisfies(c.getSubject(), req.getSubject())) {
                return Result.met(c.getTitle());
            }
        }
        return Result.none("미충족");
    }
}

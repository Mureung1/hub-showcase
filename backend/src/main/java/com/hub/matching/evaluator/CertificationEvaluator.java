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

/** 기본 0/1. 단, 상위 자격 대체 규칙을 적용한다 (정보처리기사 요구 + 기술사 보유 → 1.0). */
@Component
@RequiredArgsConstructor
public class CertificationEvaluator implements FulfillmentEvaluator {

    private final SubstitutionTable substitution;

    @Override
    public RequirementType supports() { return RequirementType.CERTIFICATION; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        if (req.getSubject() == null) return Result.none("요구 자격 미분류");

        for (Credential c : credentials) {
            if (c.getType() != CredentialType.CERTIFICATE) continue;
            if (req.getSubject().equals(c.getSubject())) {
                return Result.met(c.getTitle());
            }
            if (substitution.satisfies(c.getSubject(), req.getSubject())) {
                return Result.of(java.math.BigDecimal.ONE, c.getTitle(), "상위 자격으로 대체");
            }
        }
        return Result.none("미보유");
    }
}

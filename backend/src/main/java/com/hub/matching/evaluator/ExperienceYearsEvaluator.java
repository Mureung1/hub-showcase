package com.hub.matching.evaluator;

import com.hub.credential.Credential;
import com.hub.credential.CredentialType;
import com.hub.matching.FulfillmentEvaluator;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * f = clamp(years / threshold, 0, 1)
 *
 * 선형이 아니라 포화. 3년 요구에 6년이라고 2배 좋은 게 아니므로 초과분은 1.0 캡.
 * 미달이어도 0이 아니라 부분점수를 유지한다 (2년/3년 → 0.67).
 */
@Component
public class ExperienceYearsEvaluator implements FulfillmentEvaluator {

    @Override
    public RequirementType supports() { return RequirementType.EXPERIENCE_YEARS; }

    @Override
    public Result evaluate(JobRequirement req, List<Credential> credentials) {
        BigDecimal threshold = req.getThreshold() == null || req.getThreshold().signum() <= 0
                ? BigDecimal.ONE : req.getThreshold();

        List<Credential> careers = credentials.stream()
                .filter(c -> c.getType() == CredentialType.CAREER)
                .filter(c -> req.getSubject() == null || req.getSubject().equals(c.getSubject()))
                .filter(c -> c.getStartedOn() != null)
                .sorted(Comparator.comparing(Credential::getStartedOn))
                .toList();

        if (careers.isEmpty()) return Result.none("해당 경력 없음");

        BigDecimal years = totalYears(careers);
        BigDecimal value = years.divide(threshold, MathContext.DECIMAL64).min(BigDecimal.ONE);

        String note = String.format("경력 %.1f년 / 요구 %.1f년", years.doubleValue(), threshold.doubleValue());
        return Result.of(value, careers.get(0).getTitle(), note);
    }

    /** 기간이 겹치면 중복 계산하지 않는다 */
    private BigDecimal totalYears(List<Credential> careers) {
        long days = 0;
        LocalDate cursor = null;
        for (Credential c : careers) {
            LocalDate start = (cursor == null || c.getStartedOn().isAfter(cursor))
                    ? c.getStartedOn() : cursor;
            LocalDate end = c.getEndedOn() == null ? LocalDate.now() : c.getEndedOn();
            if (end.isAfter(start)) {
                days += ChronoUnit.DAYS.between(start, end);
                cursor = end;
            }
        }
        return BigDecimal.valueOf(days / 365.25);
    }
}

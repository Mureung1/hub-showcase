package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobRequirement;
import com.hub.position.RequirementType;

import java.math.BigDecimal;
import java.util.List;

/**
 * 충족도(0~1) 산출 전략.
 *
 * ── 기존 대비 바뀐 점 ──────────────────────────────────
 * 이전: @Primary 구현체 1개가 모든 요구조건을 처리
 * 이후: supports() 로 타입별 구현체가 분기 (EvaluatorRegistry)
 *
 * 이유: "Python 4년이 3년 요구를 얼마나 충족하나"는 산술로 답이 나온다.
 *       이걸 키워드 겹침이나 LLM 판단에 맡기면 재현성이 사라진다.
 * ──────────────────────────────────────────────────
 */
public interface FulfillmentEvaluator {

    /** 이 구현체가 담당하는 요구조건 타입 */
    RequirementType supports();

    Result evaluate(JobRequirement requirement, List<Credential> credentials);

    /**
     * @param fulfillment 0.000 ~ 1.000
     * @param evidence    판단 근거. 그대로 포지션 상세 화면에 노출된다. 근거 없으면 null
     * @param note        계산 과정 요약 (예: "경력 4.3년 / 요구 3.0년")
     */
    record Result(BigDecimal fulfillment, String evidence, String note) {

        /** 근거 없는 판정의 상한. 문서가 아니라 타입이 강제한다. */
        public static final BigDecimal NO_EVIDENCE_CAP = new BigDecimal("0.300");

        public Result {
            if (fulfillment == null) fulfillment = BigDecimal.ZERO;
            if (evidence == null && fulfillment.compareTo(NO_EVIDENCE_CAP) > 0) {
                fulfillment = NO_EVIDENCE_CAP;
            }
            if (fulfillment.compareTo(BigDecimal.ONE) > 0) fulfillment = BigDecimal.ONE;
            if (fulfillment.compareTo(BigDecimal.ZERO) < 0) fulfillment = BigDecimal.ZERO;
        }

        public static Result met(String evidence) {
            return new Result(BigDecimal.ONE, evidence, "충족");
        }

        public static Result of(BigDecimal value, String evidence, String note) {
            return new Result(value, evidence, note);
        }

        public static Result none(String note) {
            return new Result(BigDecimal.ZERO, null, note);
        }

        /** 하위호환 — 기존 호출부가 남아 있어도 컴파일된다 */
        public static Result none() {
            return none("해당 이력 없음");
        }

        public boolean hasEvidence() { return evidence != null; }
    }
}

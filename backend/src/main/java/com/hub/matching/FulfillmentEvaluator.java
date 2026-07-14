package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobRequirement;

import java.math.BigDecimal;
import java.util.List;

/**
 * 충족도(0~1) 산출 전략.
 *
 * 구현체:
 *   - KeywordFulfillmentEvaluator  (1주차, 기본값)
 *   - EmbeddingFulfillmentEvaluator (2주차, pgvector — @Primary 를 옮기면 교체)
 */
public interface FulfillmentEvaluator {

    /**
     * @param fulfillment 0.000 ~ 1.000
     * @param evidence    판단 근거. 그대로 포지션 상세 화면에 노출된다.
     */
    record Result(BigDecimal fulfillment, String evidence) {

        public static Result met(String evidence) {
            return new Result(BigDecimal.ONE, evidence);
        }

        public static Result partial(String evidence) {
            return new Result(new BigDecimal("0.500"), evidence);
        }

        public static Result none() {
            return new Result(BigDecimal.ZERO, "해당 이력 없음");
        }
    }

    Result evaluate(JobRequirement requirement, List<Credential> credentials);
}

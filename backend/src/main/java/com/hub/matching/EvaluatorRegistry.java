package com.hub.matching;

import com.hub.position.RequirementType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 타입 → evaluator 매핑. 타입을 추가하고 evaluator 를 빠뜨리면 기동 시점에 터진다.
 * (런타임에 조용히 0점이 나오는 것보다 낫다)
 */
@Component
public class EvaluatorRegistry {

    private final Map<RequirementType, FulfillmentEvaluator> evaluators =
            new EnumMap<>(RequirementType.class);

    public EvaluatorRegistry(List<FulfillmentEvaluator> beans) {
        for (FulfillmentEvaluator e : beans) {
            if (evaluators.put(e.supports(), e) != null) {
                throw new IllegalStateException("중복 evaluator: " + e.supports());
            }
        }
        for (RequirementType t : RequirementType.values()) {
            if (!evaluators.containsKey(t)) {
                throw new IllegalStateException("evaluator 누락: " + t);
            }
        }
    }

    public FulfillmentEvaluator resolve(RequirementType type) {
        return evaluators.get(type == null ? RequirementType.UNCLASSIFIED : type);
    }
}

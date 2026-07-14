package com.hub.matching;

import com.hub.credential.Credential;
import com.hub.position.JobRequirement;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

/**
 * 1주차용 임시 구현. 요구조건 이름의 토큰이 이력 텍스트에 몇 개나 등장하는지로 충족도를 추정한다.
 *
 * 정확하지 않다는 걸 전제로 둔다 — 기획서 4.3의 목표는 "대략 맞는 순서"다.
 * 2주차에 EmbeddingFulfillmentEvaluator 로 교체한다.
 */
@Primary
@Component
public class KeywordFulfillmentEvaluator implements FulfillmentEvaluator {

    @Override
    public Result evaluate(JobRequirement requirement, List<Credential> credentials) {
        String[] tokens = requirement.getName().toLowerCase(Locale.ROOT).split("[\\s/,·]+");

        for (Credential credential : credentials) {
            String haystack = (credential.getTitle() + " " + credential.getDetail())
                    .toLowerCase(Locale.ROOT);

            long hits = java.util.Arrays.stream(tokens)
                    .filter(t -> t.length() > 1 && haystack.contains(t))
                    .count();

            if (hits >= 2) {
                return Result.met(credential.getTitle());
            }
            if (hits == 1) {
                return Result.partial(credential.getTitle() + " (부분 일치)");
            }
        }

        return Result.none();
    }
}

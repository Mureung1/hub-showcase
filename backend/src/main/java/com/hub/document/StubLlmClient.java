package com.hub.document;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** 로컬 개발용. API 키 없이도 전체 흐름(잡 생성 → 폴링 → 완료)을 돌려볼 수 있다. */
@Slf4j
@Component
@Profile("local")
public class StubLlmClient implements LlmClient {

    @Override
    public String generate(String prompt) {
        log.info("[STUB] LLM 호출 대체. 프롬프트 길이={}", prompt.length());
        try {
            Thread.sleep(1500);   // 실제 지연을 흉내내 프론트 로딩 UI를 확인한다
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return "[개발용 더미 문서]\n\n실제 LLM 연동은 3주차에 붙습니다.\n\n프롬프트 앞부분:\n"
                + prompt.substring(0, Math.min(300, prompt.length()));
    }
}

package com.spendmate.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class AgentClientTest {

    @Autowired
    private AgentClient agentClient;

    @Test
    @Disabled("실제 Claude API를 호출해 비용이 발생함 — 연동 확인 후에는 계속 disabled로 둘 것")
    void 시스템프롬프트로_메시지를_보내면_응답을_받는다() {
        AgentClient.ClaudeResponse response = agentClient.sendMessage(
                AgentPromptProvider.SYSTEM_PROMPT,
                "이번 달 배달비가 늘고 예산도 많이 썼어. 어떻게 해야 할까?",
                List.of()
        );

        assertNotNull(response.stopReason());
        assertNotNull(response.content());
    }
}

package com.spendmate.service;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SubscriptionsTool implements AgentTool {

    private final SubscriptionService subscriptionService;

    public SubscriptionsTool(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Override
    public String name() {
        return "get_subscriptions";
    }

    @Override
    public Map<String, Object> definition() {
        return Map.of(
                "name", name(),
                "description", "등록된 구독(고정비) 목록을 조회합니다. 각 구독의 이름, 금액, 결제일을 반환합니다.",
                "input_schema", Map.of(
                        "type", "object",
                        "properties", Map.of()
                )
        );
    }

    @Override
    public Object execute(Map<String, Object> input, Long userId) {
        return subscriptionService.getAll(userId);
    }
}

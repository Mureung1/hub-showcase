package com.spendmate.service;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BudgetTool implements AgentTool {

    private final BudgetService budgetService;

    public BudgetTool(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @Override
    public String name() {
        return "get_budget";
    }

    @Override
    public Map<String, Object> definition() {
        return Map.of(
                "name", name(),
                "description", "이번 달 총예산을 조회합니다. amount가 null이면 사용자가 아직 예산을 설정하지 않은 것입니다.",
                "input_schema", Map.of(
                        "type", "object",
                        "properties", Map.of()
                )
        );
    }

    @Override
    public Object execute(Map<String, Object> input, Long userId) {
        return budgetService.getTotal(userId);
    }
}

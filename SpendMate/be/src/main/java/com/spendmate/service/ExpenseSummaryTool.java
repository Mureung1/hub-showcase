package com.spendmate.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class ExpenseSummaryTool implements AgentTool {

    private final ExpenseService expenseService;

    public ExpenseSummaryTool(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @Override
    public String name() {
        return "get_expense_summary";
    }

    @Override
    public Map<String, Object> definition() {
        return Map.of(
                "name", name(),
                "description", "기간별 카테고리별 지출 요약을 조회합니다. 총 지출 금액과 카테고리별 금액/비율을 반환합니다.",
                "input_schema", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "period", Map.of(
                                        "type", "string",
                                        "enum", List.of("week", "month", "3months"),
                                        "description", "조회할 기간. week=최근 7일, month=이번 달, 3months=최근 90일"
                                )
                        ),
                        "required", List.of("period")
                )
        );
    }

    @Override
    public Object execute(Map<String, Object> input, Long userId) {
        String period = (String) input.getOrDefault("period", "month");
        return expenseService.getSummary(userId, period);
    }
}
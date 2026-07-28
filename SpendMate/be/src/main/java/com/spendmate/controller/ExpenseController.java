package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.service.AgentService;
import com.spendmate.service.ExpenseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class ExpenseController {

    private final ExpenseService expenseService;
    private final AgentService agentService;

    public ExpenseController(ExpenseService expenseService, AgentService agentService) {
        this.expenseService = expenseService;
        this.agentService = agentService;
    }

    public record ManualExpenseRequest(Integer amount, Category category, String memo, LocalDateTime spentAt) {}

    @PostMapping("/api/expenses")
    public ResponseEntity<Map<String, Object>> createManual(@CurrentUser Long userId, @RequestBody ManualExpenseRequest request) {
        Expense saved = expenseService.createManual(userId, request.amount(), request.category(), request.memo(), request.spentAt());
        AgentService.JudgeResponse judge = agentService.judgeAfterExpense(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("itemName", saved.getItemName());
        response.put("amount", saved.getAmount());
        response.put("category", saved.getCategory().name());
        response.put("spentAt", saved.getSpentAt());
        response.put("agentMessage", judge.message());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/expenses/summary")
    public ResponseEntity<ExpenseService.ExpenseSummary> summary(
            @CurrentUser Long userId, @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(expenseService.getSummary(userId, period));
    }

    @GetMapping("/api/expenses/summary/daily")
    public ResponseEntity<List<ExpenseService.DailyAmount>> dailySummary(@CurrentUser Long userId) {
        return ResponseEntity.ok(expenseService.getDailySummary(userId));
    }

    @GetMapping("/api/expenses/prediction")
    public ResponseEntity<ExpenseService.PredictionResponse> prediction(@CurrentUser Long userId) {
        return ResponseEntity.ok(expenseService.getPrediction(userId));
    }

    @GetMapping("/api/expenses/recent")
    public ResponseEntity<List<ExpenseService.RecentExpense>> recent(
            @CurrentUser Long userId, @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(expenseService.getRecent(userId, limit));
    }

    @GetMapping("/api/expenses/daily-calendar")
    public ResponseEntity<List<ExpenseService.DailySpend>> dailyCalendar(@CurrentUser Long userId) {
        return ResponseEntity.ok(expenseService.getMonthlyDaily(userId));
    }

    @GetMapping("/api/expenses/savings-missions")
    public ResponseEntity<ExpenseService.SavingsMissionResponse> savingsMissions(@CurrentUser Long userId) {
        return ResponseEntity.ok(expenseService.getSavingsMissions(userId));
    }

    @GetMapping("/api/expenses/category-changes")
    public ResponseEntity<List<ExpenseService.CategoryChange>> categoryChanges(@CurrentUser Long userId) {
        return ResponseEntity.ok(expenseService.getCategoryChanges(userId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

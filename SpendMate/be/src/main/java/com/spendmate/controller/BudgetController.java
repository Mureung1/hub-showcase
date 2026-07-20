package com.spendmate.controller;

import com.spendmate.service.BudgetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    public record BudgetRequest(Integer amount) {}

    @GetMapping("/api/budget")
    public ResponseEntity<BudgetService.BudgetResponse> get() {
        return ResponseEntity.ok(budgetService.getTotal());
    }

    @PostMapping("/api/budget")
    public ResponseEntity<BudgetService.BudgetResponse> set(@RequestBody BudgetRequest request) {
        return ResponseEntity.ok(budgetService.setTotal(request.amount()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

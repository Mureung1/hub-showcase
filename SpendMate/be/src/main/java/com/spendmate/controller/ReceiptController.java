package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.domain.Expense;
import com.spendmate.domain.ReceiptSourceType;
import com.spendmate.service.AgentService;
import com.spendmate.service.ReceiptService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class ReceiptController {

    private final ReceiptService receiptService;
    private final AgentService agentService;

    public ReceiptController(ReceiptService receiptService, AgentService agentService) {
        this.receiptService = receiptService;
        this.agentService = agentService;
    }

    public record ConfirmRequest(LocalDateTime spentAt, List<ReceiptService.ExpenseDraft> items) {}

    @PostMapping("/api/receipts/upload")
    public ResponseEntity<ReceiptService.UploadResult> upload(
            @CurrentUser Long userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "PAPER_RECEIPT") ReceiptSourceType sourceType) throws IOException {

        ReceiptService.UploadResult result = receiptService.upload(userId, file, sourceType);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/api/receipts/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirm(
            @CurrentUser Long userId,
            @PathVariable("id") Long receiptId,
            @RequestBody ConfirmRequest request) {

        List<Expense> saved = receiptService.confirm(userId, receiptId, request.items(), request.spentAt());
        AgentService.JudgeResponse judge = agentService.judgeAfterExpense(userId);

        List<Map<String, Object>> expenses = saved.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", e.getId());
            m.put("itemName", e.getItemName());
            m.put("amount", e.getAmount());
            return m;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("expenses", expenses);
        response.put("agentMessage", judge.message());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}

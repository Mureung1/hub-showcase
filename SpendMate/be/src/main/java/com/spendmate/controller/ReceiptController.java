package com.spendmate.controller;

import com.spendmate.domain.Receipt;
import com.spendmate.domain.ReceiptSourceType;
import com.spendmate.service.ReceiptService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @PostMapping("/api/receipts/upload")
    public ResponseEntity<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "PAPER_RECEIPT") ReceiptSourceType sourceType) throws IOException {

        Receipt receipt = receiptService.upload(file, sourceType);

        Map<String, Object> response = new HashMap<>();
        response.put("receiptId", receipt.getId());
        response.put("imageUrl", receipt.getImageUrl());
        response.put("ocrStatus", receipt.getOcrStatus());
        return ResponseEntity.ok(response);
    }
}
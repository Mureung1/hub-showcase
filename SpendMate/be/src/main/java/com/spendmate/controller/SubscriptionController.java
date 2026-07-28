package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.domain.Subscription;
import com.spendmate.service.SubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    public record SubscriptionRequest(String name, Integer price, Integer billingDay) {}

    @GetMapping("/api/subscriptions")
    public ResponseEntity<List<SubscriptionService.SubscriptionResponse>> getAll(@CurrentUser Long userId) {
        return ResponseEntity.ok(subscriptionService.getAll(userId));
    }

    @PostMapping("/api/subscriptions")
    public ResponseEntity<Map<String, Object>> create(@CurrentUser Long userId, @RequestBody SubscriptionRequest request) {
        Subscription saved = subscriptionService.create(userId, request.name(), request.price(), request.billingDay());

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("name", saved.getServiceName());
        response.put("price", saved.getAmount());
        response.put("billingDay", saved.getBillingDay());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/api/subscriptions/{id}")
    public ResponseEntity<Map<String, Object>> update(@CurrentUser Long userId, @PathVariable Long id, @RequestBody SubscriptionRequest request) {
        Subscription saved = subscriptionService.update(userId, id, request.name(), request.price(), request.billingDay());

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("name", saved.getServiceName());
        response.put("price", saved.getAmount());
        response.put("billingDay", saved.getBillingDay());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/subscriptions/{id}")
    public ResponseEntity<Void> delete(@CurrentUser Long userId, @PathVariable Long id) {
        subscriptionService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
    }
}

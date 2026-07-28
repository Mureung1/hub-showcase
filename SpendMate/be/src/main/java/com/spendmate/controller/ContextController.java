package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.service.ContextService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContextController {

    private final ContextService contextService;

    public ContextController(ContextService contextService) {
        this.contextService = contextService;
    }

    @GetMapping("/api/context")
    public ResponseEntity<ContextService.Context> getContext(@CurrentUser Long userId) {
        return ResponseEntity.ok(contextService.getContext(userId));
    }
}

package com.spendmate.controller;

import com.spendmate.config.CurrentUser;
import com.spendmate.service.AgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AgentController {

    private final AgentService agentService;

    public record ChatRequest(String message) {}

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @PostMapping("/api/agent/chat")
    public ResponseEntity<AgentService.ChatResponse> chat(@CurrentUser Long userId, @RequestBody ChatRequest request) {
        return ResponseEntity.ok(agentService.chat(userId, request.message()));
    }
}

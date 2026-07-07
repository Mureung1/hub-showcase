package com.agent.student_agent;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*") // 추후 특정 origin으로 제한 필요
public class HealthCheckController {

    @GetMapping("/api/health")
    public String healthCheck() {
        return "System is running";
    }
}

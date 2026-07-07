package com.agent.student_agent.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
}

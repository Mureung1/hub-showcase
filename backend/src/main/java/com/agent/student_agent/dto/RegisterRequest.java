package com.agent.student_agent.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String name;
    private String major;
    private Integer grade;
}

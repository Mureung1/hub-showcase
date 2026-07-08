package com.agent.student_agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StudentAgentApplication {

	public static void main(String[] args) {
		SpringApplication.run(StudentAgentApplication.class, args);
	}

}

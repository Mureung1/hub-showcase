package com.punchman.devpulse.bootstrap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.punchman.devpulse")
public class DevpulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevpulseApplication.class, args);
    }
}

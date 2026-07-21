package com.punchman.devpulse.bootstrap;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.punchman.devpulse")
@EnableJpaRepositories(basePackages = "com.punchman.devpulse.repository.jpa")
@EntityScan(basePackages = "com.punchman.devpulse.domain")
@MapperScan(basePackages = "com.punchman.devpulse.repository.mybatis")
public class DevpulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevpulseApplication.class, args);
    }
}

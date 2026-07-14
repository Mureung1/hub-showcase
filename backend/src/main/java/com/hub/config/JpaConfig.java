package com.hub.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing          // BaseEntity의 createdAt 자동 채움
public class JpaConfig {
}

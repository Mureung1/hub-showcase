package com.punchman.devpulse.collector;

import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Feign;
import feign.jackson.JacksonDecoder;
import feign.jackson.JacksonEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GitHubGraphQlConfig {

    private static final String GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

    @Bean
    public GitHubGraphQlClient gitHubGraphQlClient(@Value("${devpulse.github.token}") String token) {
        ObjectMapper objectMapper = new ObjectMapper();
        return Feign.builder()
                .encoder(new JacksonEncoder(objectMapper))
                .decoder(new JacksonDecoder(objectMapper))
                .requestInterceptor(template -> template.header("Authorization", "Bearer " + token))
                .target(GitHubGraphQlClient.class, GITHUB_GRAPHQL_URL);
    }
}

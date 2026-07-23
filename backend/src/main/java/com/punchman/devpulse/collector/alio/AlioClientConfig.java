package com.punchman.devpulse.collector.alio;

import feign.Feign;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AlioClientConfig {

    private static final String ALIO_BASE_URL = "https://opendata.alio.go.kr";

    @Bean
    public AlioRecruitInquiryClient alioRecruitInquiryClient() {
        return Feign.builder().target(AlioRecruitInquiryClient.class, ALIO_BASE_URL);
    }
}

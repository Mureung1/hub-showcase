package com.placepick.infrastructure.external;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ExternalApiProperties.class)
public class ExternalApiSafetyConfiguration {

    @Bean
    ExternalApiEndpointPolicy externalApiEndpointPolicy() {
        return new ExternalApiEndpointPolicy();
    }

    @Bean
    ExternalApiSafetyVerifier externalApiSafetyVerifier(
        Environment environment,
        ExternalApiProperties properties,
        ExternalApiEndpointPolicy policy
    ) {
        Set<String> profiles = effectiveProfiles(environment);
        policy.requireSafe(profiles, properties);
        return new ExternalApiSafetyVerifier(profiles);
    }

    private Set<String> effectiveProfiles(Environment environment) {
        String[] activeProfiles = environment.getActiveProfiles();
        String[] profiles = activeProfiles.length > 0
            ? activeProfiles
            : environment.getDefaultProfiles();
        return Arrays.stream(profiles).collect(Collectors.toUnmodifiableSet());
    }

    record ExternalApiSafetyVerifier(Set<String> verifiedProfiles) {
    }
}

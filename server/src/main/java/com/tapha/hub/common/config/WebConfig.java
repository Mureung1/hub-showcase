package com.tapha.hub.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.tapha.hub.auth.presentation.AuthenticationInterceptor;
import com.tapha.hub.auth.presentation.CsrfInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String allowedOrigin;
    private final AuthenticationInterceptor authenticationInterceptor;
    private final CsrfInterceptor csrfInterceptor;

    public WebConfig(
            @Value("${app.cors.allowed-origin:http://localhost:5173}") String allowedOrigin,
            AuthenticationInterceptor authenticationInterceptor,
            CsrfInterceptor csrfInterceptor
    ) {
        this.allowedOrigin = allowedOrigin;
        this.authenticationInterceptor = authenticationInterceptor;
        this.csrfInterceptor = csrfInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "X-CSRF-Token")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authenticationInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/google");
        registry.addInterceptor(csrfInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/google");
    }
}

package com.placepick.infrastructure.external;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "placepick.external")
public record ExternalApiProperties(
    @NotBlank String mode,
    @NotNull URI naverBaseUrl,
    @NotNull URI llmBaseUrl
) {
}

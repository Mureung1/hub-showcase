package com.spendmate.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

@Component
public class ClovaOcrClient {

    @Value("${clova.ocr.invoke-url}")
    private String invokeUrl;

    @Value("${clova.ocr.secret-key}")
    private String secretKey;

    public String requestOcr(byte[] imageBytes, String format) throws IOException, InterruptedException {
        String base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);

        String requestBody = """
                {
                  "version": "V2",
                  "requestId": "%s",
                  "timestamp": %d,
                  "images": [
                    {
                      "format": "%s",
                      "name": "receipt",
                      "data": "%s"
                    }
                  ]
                }
                """.formatted(UUID.randomUUID(), System.currentTimeMillis(), format, base64Image);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(invokeUrl))
                .header("X-OCR-SECRET", secretKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("클로바 OCR 호출 실패: status=" + response.statusCode() + ", body=" + response.body());
        }

        return response.body();
    }
}
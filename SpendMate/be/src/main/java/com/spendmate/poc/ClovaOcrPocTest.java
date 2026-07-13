package com.spendmate.poc;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;

public class ClovaOcrPocTest {

    // TODO: NCP 콘솔 > CLOVA OCR > 도메인(영수증) 설정에서 발급받은 값으로 교체
    private static final String INVOKE_URL = "https://xxxxx.apigw.ntruss.com/custom/v1/xxxxx/general";
    private static final String SECRET_KEY = "여기에_시크릿_키";
    private static final String IMAGE_PATH = "/Users/soyeon/Desktop/receipt-sample.jpg"; // 테스트할 영수증 사진 경로
    private static final String IMAGE_FORMAT = "jpg"; // 이미지 확장자에 맞게 (jpg/png)

    public static void main(String[] args) throws IOException, InterruptedException {
        byte[] imageBytes = Files.readAllBytes(Path.of(IMAGE_PATH));
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

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
                """.formatted(UUID.randomUUID(), System.currentTimeMillis(), IMAGE_FORMAT, base64Image);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(INVOKE_URL))
                .header("X-OCR-SECRET", SECRET_KEY)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
    }
}

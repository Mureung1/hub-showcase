package com.spendmate.poc;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class NaverShoppingPocTest {

    // TODO: 네이버 개발자센터(developers.naver.com/apps) > 애플리케이션 등록 > "검색" API 사용 설정 후 발급받은 값으로 교체
    private static final String CLIENT_ID = "여기에_클라이언트_ID";
    private static final String CLIENT_SECRET = "여기에_클라이언트_시크릿";
    private static final String QUERY = "세제"; // 최저가 비교 테스트할 상품명
    private static final int DISPLAY_COUNT = 10; // 검색 결과 개수 (최대 100)

    public static void main(String[] args) throws IOException, InterruptedException {
        String encodedQuery = URLEncoder.encode(QUERY, StandardCharsets.UTF_8);
        String url = "https://openapi.naver.com/v1/search/shop.json?query=" + encodedQuery
                + "&display=" + DISPLAY_COUNT
                + "&sort=asc"; // asc: 가격 낮은순 정렬

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("X-Naver-Client-Id", CLIENT_ID)
                .header("X-Naver-Client-Secret", CLIENT_SECRET)
                .GET()
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
    }
}

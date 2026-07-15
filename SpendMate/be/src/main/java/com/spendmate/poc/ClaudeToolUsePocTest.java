package com.spendmate.poc;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ClaudeToolUsePocTest {

    // .env의 CLAUDE_API_KEY를 셸에 export한 뒤 실행해야 함 (export $(cat .env | xargs))
    private static final String API_KEY = System.getenv("CLAUDE_API_KEY");
    private static final String API_URL = "https://api.anthropic.com/v1/messages";

    public static void main(String[] args) throws IOException, InterruptedException {
        String requestBody = """
                {
                  "model": "claude-sonnet-5",
                  "max_tokens": 1024,
                  "tools": [
                    {
                      "name": "recipe_tool",
                      "description": "최근 배달/외식 소비가 늘어난 사용자에게 대체 가능한 레시피를 추천한다.",
                      "input_schema": {
                        "type": "object",
                        "properties": {
                          "reason": { "type": "string", "description": "이 Tool을 실행하기로 판단한 근거" }
                        },
                        "required": ["reason"]
                      }
                    },
                    {
                      "name": "smart_purchase_tool",
                      "description": "반복 구매하는 생필품에 대해 최저가/대체 구매처를 추천한다.",
                      "input_schema": {
                        "type": "object",
                        "properties": {
                          "reason": { "type": "string", "description": "이 Tool을 실행하기로 판단한 근거" }
                        },
                        "required": ["reason"]
                      }
                    }
                  ],
                  "messages": [
                    {
                      "role": "user",
                      "content": "너는 사용자가 예산 안에서 지속 가능하게, 그리고 더 경제적으로 소비하도록 돕는 AI 소비 코치야. 아래 이번 달 소비 Context를 보고, 개입이 필요하면 적절한 Tool을 실행하고, 필요 없으면 Tool 없이 짧게 안내만 해줘.\\n\\nContext:\\n- 배달비 증가율: 최근 2주간 42% 증가\\n- 이번 달 예산 사용률: 85% (예산 소진 임박)\\n- 반복 구매 패턴: 없음\\n- 구독 상태: 특이사항 없음"
                    }
                  ]
                }
                """;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("x-api-key", API_KEY)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
    }
}
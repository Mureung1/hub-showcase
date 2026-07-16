package com.spendmate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 좌표 규칙 대신 Claude(LLM)에게 OCR 텍스트를 통째로 주고 품목/가격을 뽑아달라고 요청한다.
 * 매장마다 영수증 레이아웃이 달라 좌표 기반 파싱이 하나로마트 외 다른 매장(예: 롯데마트)에서 깨지는 문제를
 * 해결하기 위해 도입 — 가장 저렴한 모델(Haiku)로도 단순 구조화 추출은 충분하다.
 */
@Component
public class ClaudeItemExtractor {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-haiku-4-5-20251001";

    @Value("${claude.api-key}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record ExtractedItem(String name, Integer amount) {}
    public record ExtractionResult(List<ExtractedItem> items, Integer discount) {}

    public ExtractionResult extract(String receiptText) throws IOException, InterruptedException {
        String prompt = """
                아래는 영수증 또는 주문내역을 OCR로 인식한 텍스트야. 다음 두 가지를 JSON으로만 응답해, 설명은 하지마.

                1. items: 실제 구매한 품목명과 각 품목의 최종 가격(원). 부가세/합계/포인트적립/카드결제 안내 같은
                   요약·안내 문구는 품목이 아니니까 제외해.
                   한 품목에 숫자가 여러 개 있으면(단가, 수량, 금액이 따로 표시된 경우) 헷갈리기 쉬운데,
                   "금액"은 보통 "단가 × 수량"과 값이 같아 — 후보가 여러 개면 이 계산이 맞는 숫자를 최종 금액으로
                   골라줘 (예: 단가 1,980원에 수량 3개면 금액은 1,980이 아니라 1,980×3=5,940원). 그 옆에 붙은
                   "[덤행사]", "이벤트" 같은 프로모션 할인 숫자는 품목 가격이 아니니 items에 넣지 마.
                2. discount: 영수증에 표시된 할인 총액. 라벨이 "총할인액", "자사할인", "할인금액", "누적할인액",
                   "단수할인" 등 뭐라고 적혀있든, 실제로 차감된 할인 금액을 전부 더해서 하나의 음수 정수로 알려줘.
                   할인이 없으면 0.

                형식: {"items": [{"name": "품목명", "amount": 가격숫자}], "discount": 할인숫자}

                텍스트:
                %s
                """.formatted(receiptText);

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Claude API 호출 실패: " + response.statusCode() + " " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String text = root.path("content").get(0).path("text").asText();
        return parseResult(text);
    }

    private ExtractionResult parseResult(String text) throws IOException {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start == -1 || end == -1) {
            return new ExtractionResult(List.of(), 0);
        }

        JsonNode root = objectMapper.readTree(text.substring(start, end + 1));

        List<ExtractedItem> items = new ArrayList<>();
        for (JsonNode node : root.path("items")) {
            String name = node.path("name").asText(null);
            if (name == null || !node.hasNonNull("amount")) {
                continue;
            }
            items.add(new ExtractedItem(name, node.path("amount").asInt()));
        }

        return new ExtractionResult(items, root.path("discount").asInt(0));
    }
}

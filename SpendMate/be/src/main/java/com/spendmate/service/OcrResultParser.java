package com.spendmate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class OcrResultParser {

    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
    private static final Pattern MONEY_PATTERN = Pattern.compile("^-?\\d{1,3}(,\\d{3})+원?$");

    public record ParsedField(String text, double x, double y) {}
    public record ParsedReceipt(String storeName, Integer amount, LocalDateTime spentAt) {}

    /**
     * 좌표 없이 순수 텍스트만 순서대로 반환한다 (ClaudeItemExtractor에 넘길 용도).
     */
    public List<String> extractTexts(String ocrRawJson) throws Exception {
        return extractFields(ocrRawJson).stream().map(ParsedField::text).toList();
    }

    private List<ParsedField> extractFields(String ocrRawJson) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(ocrRawJson);
        JsonNode fields = root.path("images").get(0).path("fields");

        List<ParsedField> result = new ArrayList<>();
        for (JsonNode field : fields) {
            String text = field.path("inferText").asText();
            JsonNode vertices = field.path("boundingPoly").path("vertices");
            double sumX = 0, sumY = 0;
            int count = 0;
            for (JsonNode v : vertices) {
                sumX += v.path("x").asDouble();
                sumY += v.path("y").asDouble();
                count++;
            }
            result.add(new ParsedField(text, count > 0 ? sumX / count : 0, count > 0 ? sumY / count : 0));
        }
        return result;
    }

    public ParsedReceipt parseSummary(String ocrRawJson) throws Exception {
        List<String> texts = extractFields(ocrRawJson).stream().map(ParsedField::text).toList();
        return new ParsedReceipt(extractStoreName(texts), extractTotalAmount(texts), extractDate(texts));
    }

    private static final Pattern TIME_PATTERN = Pattern.compile("^\\d{1,2}:\\d{2}$");
    private static final List<String> STORE_NAME_NOISE = List.of(
            "고객용", "매출전표", "영수증", "주문상세", "→", "주문", "메뉴", "결제", "정보"
    );

    private String extractStoreName(List<String> texts) {
        StringBuilder sb = new StringBuilder();
        int taken = 0;
        for (String text : texts) {
            if (taken >= 3) break;
            if (TIME_PATTERN.matcher(text).matches()) continue;
            if (text.startsWith("[") && text.endsWith("]")) continue;
            if (STORE_NAME_NOISE.stream().anyMatch(text::contains)) continue;
            sb.append(text);
            taken++;
        }
        return sb.toString();
    }

    private Integer extractTotalAmount(List<String> texts) {
        int max = 0;
        for (String text : texts) {
            if (MONEY_PATTERN.matcher(text).matches()) {
                int value = Math.abs(Integer.parseInt(text.replace(",", "").replace("원", "")));
                if (value > max) max = value;
            }
        }
        return max == 0 ? null : max;
    }

    private LocalDateTime extractDate(List<String> texts) {
        for (String text : texts) {
            Matcher matcher = DATE_PATTERN.matcher(text);
            if (matcher.find()) {
                return LocalDate.of(Integer.parseInt(matcher.group(1)), Integer.parseInt(matcher.group(2)), Integer.parseInt(matcher.group(3))).atStartOfDay();
            }
        }
        return LocalDateTime.now();
    }
}

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
    private static final Pattern ITEM_CODE_PATTERN = Pattern.compile("^\\d{3}$");
    private static final Pattern BARCODE_PATTERN = Pattern.compile("^\\*?\\d{6,}$");
    private static final Pattern QUANTITY_PATTERN = Pattern.compile("^\\d{1,2}$");

    // "금액" 컬럼은 대략 이 x좌표 오른쪽에 몰려있고, "단가"/"수량" 컬럼은 왼쪽에 있음 (실제 영수증 좌표 분석으로 확인)
    private static final double AMOUNT_COLUMN_X = 2650;
    // 진짜 품목코드(001,002...)는 항상 이 x좌표보다 왼쪽(상품코드 칸)에 있음. 이보다 오른쪽에 있는 3자리 숫자는
    // 단가/부가세 같은 다른 값이 우연히 3자리인 것뿐이라 품목코드가 아님
    private static final double ITEM_CODE_COLUMN_X = 1650;
    // 마지막 품목 구간이 총구매액 영역까지 무한히 안 늘어나게 막는 최대 높이 (품목 한 줄 높이 기준으로 넉넉히 잡음)
    private static final double MAX_SEGMENT_HEIGHT = 165;

    private static final List<String> GROCERY_KEYWORDS = List.of(
            "마트", "편의점", "GS25", "CU", "세븐일레븐", "이마트", "홈플러스", "농협", "하나로", "슈퍼"
    );

    public record ParsedField(String text, double x, double y) {}
    public record ParsedReceipt(String storeName, Integer amount, LocalDateTime spentAt) {}
    public record ParsedItem(String name, Integer amount) {}

    public boolean looksLikeGroceryStore(String storeName) {
        if (storeName == null) {
            return false;
        }
        return GROCERY_KEYWORDS.stream().anyMatch(storeName::contains);
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

    public List<ParsedItem> parseItems(String ocrRawJson) throws Exception {
        List<ParsedField> parsedFields = extractFields(ocrRawJson);

        List<ParsedField> itemCodes = parsedFields.stream()
                .filter(f -> ITEM_CODE_PATTERN.matcher(f.text()).matches())
                .filter(f -> f.x() < ITEM_CODE_COLUMN_X)
                .sorted((a, b) -> Double.compare(a.y(), b.y()))
                .toList();

        List<ParsedItem> items = new ArrayList<>();

        for (int i = 0; i < itemCodes.size(); i++) {
            ParsedField code = itemCodes.get(i);
            double segmentStart = code.y() - 10;
            double nextCodeY = (i + 1 < itemCodes.size()) ? itemCodes.get(i + 1).y() - 10 : Double.MAX_VALUE;
            double segmentEnd = Math.min(nextCodeY, code.y() + MAX_SEGMENT_HEIGHT);

            List<ParsedField> segment = parsedFields.stream()
                    .filter(f -> f.y() >= segmentStart && f.y() < segmentEnd)
                    .toList();

            String name = segment.stream()
                    .filter(f -> f.x() < AMOUNT_COLUMN_X)
                    .filter(f -> !ITEM_CODE_PATTERN.matcher(f.text()).matches())
                    .filter(f -> !BARCODE_PATTERN.matcher(f.text()).matches())
                    .filter(f -> !QUANTITY_PATTERN.matcher(f.text()).matches())
                    .filter(f -> !MONEY_PATTERN.matcher(f.text()).matches())
                    .map(ParsedField::text)
                    .reduce("", (a, b) -> a + b);

            Integer amount = segment.stream()
                    .filter(f -> f.x() >= AMOUNT_COLUMN_X)
                    .filter(f -> MONEY_PATTERN.matcher(f.text()).matches())
                    .min((a, b) -> Double.compare(Math.abs(a.y() - code.y()), Math.abs(b.y() - code.y())))
                    .map(f -> Math.abs(Integer.parseInt(f.text().replace(",", "").replace("원", ""))))
                    .orElse(null);

            if (!name.isBlank() && amount != null) {
                items.add(new ParsedItem(name, amount));
            }
        }
        return items;
    }

    // 영수증 하단 "총할인액:" 같은 요약 줄에서 할인 총액을 찾는다 (개별 품목마다 짝짓지 않고, 안정적인 요약 라벨 기준으로)
    public Integer extractDiscount(String ocrRawJson) throws Exception {
        List<ParsedField> parsedFields = extractFields(ocrRawJson);

        ParsedField discountLabel = parsedFields.stream()
                .filter(f -> f.text().contains("총할인액"))
                .findFirst()
                .orElse(null);

        if (discountLabel == null) {
            return null;
        }

        return parsedFields.stream()
                .filter(f -> f.x() >= AMOUNT_COLUMN_X)
                .filter(f -> MONEY_PATTERN.matcher(f.text()).matches())
                .filter(f -> f.text().startsWith("-"))
                .min((a, b) -> Double.compare(Math.abs(a.y() - discountLabel.y()), Math.abs(b.y() - discountLabel.y())))
                .map(f -> Integer.parseInt(f.text().replace(",", "").replace("원", "")))
                .orElse(null);
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

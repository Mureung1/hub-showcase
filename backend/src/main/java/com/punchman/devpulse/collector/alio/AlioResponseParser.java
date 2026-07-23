package com.punchman.devpulse.collector.alio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

/**
 * 실제 응답으로 확인된 envelope 구조: {"data": {"result": [...], "resultCode":, "totalCount":,
 * "resultMsg":}, "pathParam": "recrut"} — 2026-07-22 opendata.alio.go.kr 실제 호출로 직접 확인.
 */
public final class AlioResponseParser {

    private AlioResponseParser() {
    }

    public static List<AlioRecrutItem> parseItems(ObjectMapper objectMapper, String rawJson) {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawJson);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("ALIO 응답 파싱 실패: " + rawJson, e);
        }
        JsonNode listNode = root.path("data").path("result");
        if (!listNode.isArray()) {
            throw new IllegalStateException(
                    "ALIO 응답에서 data.result 배열을 찾지 못했습니다. 실제 응답 구조 확인 필요: " + rawJson);
        }
        return objectMapper.convertValue(listNode, new TypeReference<List<AlioRecrutItem>>() {
        });
    }
}

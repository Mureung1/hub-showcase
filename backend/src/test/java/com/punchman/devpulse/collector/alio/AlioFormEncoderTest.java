package com.punchman.devpulse.collector.alio;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AlioFormEncoderTest {

    @Test
    void encodesMultipleParamsJoinedByAmpersand() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("key", "abc123");
        params.put("pageNo", "1");
        params.put("numOfRows", "100");

        String encoded = AlioFormEncoder.encode(params);

        assertThat(encoded).isEqualTo("key=abc123&pageNo=1&numOfRows=100");
    }

    @Test
    void urlEncodesKoreanAndSpecialCharacters() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("recrutPbancTtl", "반도체 품질관리");

        String encoded = AlioFormEncoder.encode(params);

        assertThat(encoded).isEqualTo("recrutPbancTtl=%EB%B0%98%EB%8F%84%EC%B2%B4+%ED%92%88%EC%A7%88%EA%B4%80%EB%A6%AC");
    }

    @Test
    void skipsEntriesWithNullValue() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("key", "abc123");
        params.put("optional", null);

        String encoded = AlioFormEncoder.encode(params);

        assertThat(encoded).isEqualTo("key=abc123");
    }

    @Test
    void emptyMapEncodesToEmptyString() {
        assertThat(AlioFormEncoder.encode(Map.of())).isEmpty();
    }
}

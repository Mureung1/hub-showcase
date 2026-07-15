package com.placepick.infrastructure.external.naver;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class NaverTextSanitizerTest {

    @Test
    void removesMarkupDecodesEntitiesAndNormalizesWhitespace() {
        String source = " <b>가상</b> &amp; <em>테스트</em>\n 장소 ";

        assertThat(NaverTextSanitizer.plainText(source)).isEqualTo("가상 & 테스트 장소");
    }

    @Test
    void treatsNullAndBlankProviderValuesAsEmptyText() {
        assertThat(NaverTextSanitizer.plainText(null)).isEmpty();
        assertThat(NaverTextSanitizer.plainText("  ")).isEmpty();
    }

    @Test
    void matchesTheCrossRuntimeNaverHtmlConformanceVectors() {
        List<ConformanceVector> vectors = List.of(
            new ConformanceVector(
                "NAVER_HTML_V1_NUMERIC",
                "카페 &#38; 디저트 &#x1F600; &#X41;",
                "카페 & 디저트 😀 A"
            ),
            new ConformanceVector(
                "NAVER_HTML_V1_NAMED_CASE",
                "&copy; &thetasym; &AMP; &apos; &unknown;",
                "© ϑ &AMP; &apos; &unknown;"
            ),
            new ConformanceVector(
                "NAVER_HTML_V1_MALFORMED_BOUNDED",
                "&amp;lt; &#0000065; &#00000065; &#x; &broken",
                "&lt; A &#00000065; &#x; &broken"
            ),
            new ConformanceVector(
                "NAVER_HTML_V1_NEGATIVE_OUT_OF_RANGE",
                "&#-1; &#x-1; &#1114112;",
                "&#-1; &#x-1; &#1114112;"
            ),
            new ConformanceVector(
                "NAVER_HTML_V1_ESCAPED_MARKUP",
                "&lt;b&gt;강남&lt;/b&gt; 카페",
                "강남 카페"
            ),
            new ConformanceVector(
                "NAVER_HTML_V1_UNICODE_WHITESPACE",
                "\u2003카페&nbsp;\tA\u2003B\u2003",
                "카페 A B"
            )
        );

        for (ConformanceVector vector : vectors) {
            assertThat(NaverTextSanitizer.plainText(vector.input()))
                .as(vector.id())
                .isEqualTo(vector.expected());
        }
    }

    private record ConformanceVector(String id, String input, String expected) {
    }
}

package com.placepick.infrastructure.external.naver;

import static org.assertj.core.api.Assertions.assertThat;

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
}

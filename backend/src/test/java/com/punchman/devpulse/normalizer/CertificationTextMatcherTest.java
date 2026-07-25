package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CertificationTextMatcherTest {

    @Test
    void returnsTrueWhenNameAppearsInOneOfTheTexts() {
        assertThat(CertificationTextMatcher.mentions("산업안전기사", "응시자격: 없음", "우대: 산업안전기사 자격증 소지자")).isTrue();
    }

    @Test
    void returnsFalseWhenNameDoesNotAppearInAnyText() {
        assertThat(CertificationTextMatcher.mentions("산업안전기사", "응시자격: 없음", "우대: 컴퓨터활용능력 1급")).isFalse();
    }

    @Test
    void nullTextsAreIgnoredSafely() {
        assertThat(CertificationTextMatcher.mentions("SQLD", null, "SQLD 자격증 우대")).isTrue();
        assertThat(CertificationTextMatcher.mentions("SQLD", null, null)).isFalse();
    }

    @Test
    void blankCertificationNameReturnsFalse() {
        assertThat(CertificationTextMatcher.mentions("", "아무 텍스트")).isFalse();
    }
}

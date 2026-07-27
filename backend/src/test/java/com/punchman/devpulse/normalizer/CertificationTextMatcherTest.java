package com.punchman.devpulse.normalizer;

import static org.assertj.core.api.Assertions.assertThat;

import com.punchman.devpulse.normalizer.CertificationTextMatcher.MentionField;
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

    @Test
    void classifyReturnsQualificationWhenOnlyQualificationTextMatches() {
        MentionField field = CertificationTextMatcher.classify(
                "산업안전기사", "산업안전기사 자격증 소지자에 한함", "우대: 없음");

        assertThat(field).isEqualTo(MentionField.QUALIFICATION);
    }

    @Test
    void classifyReturnsPreferenceWhenOnlyPreferenceTextMatches() {
        MentionField field = CertificationTextMatcher.classify(
                "SQLD", "응시자격: 없음", "SQLD 자격증 소지자 우대");

        assertThat(field).isEqualTo(MentionField.PREFERENCE);
    }

    @Test
    void classifyPrefersQualificationWhenBothTextsMatch() {
        MentionField field = CertificationTextMatcher.classify(
                "정보처리기사", "정보처리기사 자격증 소지자에 한함", "정보처리기사 우대");

        assertThat(field).isEqualTo(MentionField.QUALIFICATION);
    }

    @Test
    void classifyReturnsNoneWhenNeitherTextMatches() {
        MentionField field = CertificationTextMatcher.classify(
                "SQLD", "응시자격: 없음", "우대: 컴퓨터활용능력 1급");

        assertThat(field).isEqualTo(MentionField.NONE);
    }

    @Test
    void classifyReturnsNoneForBlankCertificationName() {
        MentionField field = CertificationTextMatcher.classify("", "아무 텍스트", "아무 텍스트");

        assertThat(field).isEqualTo(MentionField.NONE);
    }

    @Test
    void classifyIgnoresNullTextsSafely() {
        assertThat(CertificationTextMatcher.classify("SQLD", null, "SQLD 자격증 우대"))
                .isEqualTo(MentionField.PREFERENCE);
        assertThat(CertificationTextMatcher.classify("SQLD", null, null))
                .isEqualTo(MentionField.NONE);
    }
}

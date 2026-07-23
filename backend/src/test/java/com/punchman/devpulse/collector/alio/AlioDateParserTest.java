package com.punchman.devpulse.collector.alio;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AlioDateParserTest {

    @Test
    void parsesValidEightDigitDate() {
        assertThat(AlioDateParser.parse("20260721")).isEqualTo(LocalDate.of(2026, 7, 21));
    }

    @Test
    void nullReturnsNull() {
        assertThat(AlioDateParser.parse(null)).isNull();
    }

    @Test
    void emptyStringReturnsNull() {
        assertThat(AlioDateParser.parse("")).isNull();
    }

    @Test
    void tooShortReturnsNull() {
        assertThat(AlioDateParser.parse("2026721")).isNull();
    }

    @Test
    void tooLongReturnsNull() {
        assertThat(AlioDateParser.parse("202607211")).isNull();
    }

    @Test
    void nonDigitCharacterReturnsNull() {
        assertThat(AlioDateParser.parse("2026072a")).isNull();
    }

    @Test
    void separatorMixedInReturnsNull() {
        assertThat(AlioDateParser.parse("2026-07-21")).isNull();
    }

    @Test
    void nonExistentCalendarDateReturnsNull() {
        assertThat(AlioDateParser.parse("20260231")).isNull();
    }
}

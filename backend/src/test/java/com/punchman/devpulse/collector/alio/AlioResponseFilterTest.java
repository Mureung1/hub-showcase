package com.punchman.devpulse.collector.alio;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.Test;

class AlioResponseFilterTest {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final LocalDate TODAY = LocalDate.of(2026, 7, 22);
    private static final long RECENT_MONTHS = 3;

    @Test
    void ongoingAndRecentIsCollectable() {
        AlioRecrutItem item = item("Y", TODAY.minusMonths(1));

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isTrue();
    }

    @Test
    void notOngoingIsExcludedRegardlessOfDate() {
        AlioRecrutItem item = item("N", TODAY);

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isFalse();
    }

    @Test
    void ongoingButOlderThanWindowIsExcluded() {
        AlioRecrutItem item = item("Y", TODAY.minusMonths(RECENT_MONTHS).minusDays(1));

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isFalse();
    }

    @Test
    void exactlyAtWindowBoundaryIsCollectable() {
        AlioRecrutItem item = item("Y", TODAY.minusMonths(RECENT_MONTHS));

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isTrue();
    }

    @Test
    void missingStartDateIsExcluded() {
        AlioRecrutItem item = new AlioRecrutItem(
                123L, "제목", "기관", "자격", "우대요약", "우대상세", "NCS", "Y", null, null);

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isFalse();
    }

    @Test
    void unparseableStartDateIsExcluded() {
        AlioRecrutItem item = new AlioRecrutItem(
                123L, "제목", "기관", "자격", "우대요약", "우대상세", "NCS", "Y", "not-a-date", null);

        assertThat(AlioResponseFilter.isCollectable(item, TODAY, RECENT_MONTHS)).isFalse();
    }

    private AlioRecrutItem item(String ongoingYn, LocalDate startDate) {
        return new AlioRecrutItem(
                123L, "제목", "기관", "자격", "우대요약", "우대상세", "NCS", ongoingYn,
                startDate.format(DATE_FORMAT), TODAY.format(DATE_FORMAT));
    }
}

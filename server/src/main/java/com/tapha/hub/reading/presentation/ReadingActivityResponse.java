package com.tapha.hub.reading.presentation;

import java.time.LocalDate;
import java.util.List;

public record ReadingActivityResponse(
        LocalDate from,
        LocalDate to,
        List<Day> days
) {
    public record Day(LocalDate date, long count) { }
}

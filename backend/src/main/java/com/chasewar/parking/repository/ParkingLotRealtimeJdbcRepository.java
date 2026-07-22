package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLotRealtime;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ParkingLotRealtimeJdbcRepository {

    private static final String UPSERT_SQL = """
            INSERT INTO parking_lot_realtime (
                pklt_cd, total_slots, available_slots, source_updated_at, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?
            )
            ON DUPLICATE KEY UPDATE
                total_slots = VALUES(total_slots),
                available_slots = VALUES(available_slots),
                source_updated_at = VALUES(source_updated_at),
                updated_at = VALUES(updated_at)
            """;

    private final JdbcTemplate jdbcTemplate;

    public void upsertAll(List<ParkingLotRealtime> realtimes) {
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.batchUpdate(UPSERT_SQL, realtimes, realtimes.size(), (ps, parkingLotRealtime) -> {
            ps.setString(1, parkingLotRealtime.getPkltCd());
            ps.setInt(2, parkingLotRealtime.getTotalSlots());
            ps.setInt(3, parkingLotRealtime.getAvailableSlots());
            ps.setObject(4, parkingLotRealtime.getSourceUpdatedAt());
            ps.setObject(5, now);
            ps.setObject(6, now);
        });
    }
}

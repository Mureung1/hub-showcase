package com.chasewar.parking.repository;

import com.chasewar.parking.domain.ParkingLot;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ParkingLotJdbcRepository {

    private static final String UPSERT_SQL = """
            INSERT INTO parking_lot (
                pklt_cd, name, address, district, tel,
                parking_kind, oper_type, total_slots,
                basic_fee, basic_minutes, extra_unit_fee, extra_unit_min, day_max_fee,
                pay_type,
                weekday_start, weekday_end, weekend_start, weekend_end, holiday_start, holiday_end,
                realtime_available, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                address = VALUES(address),
                district = VALUES(district),
                tel = VALUES(tel),
                parking_kind = VALUES(parking_kind),
                oper_type = VALUES(oper_type),
                total_slots = VALUES(total_slots),
                basic_fee = VALUES(basic_fee),
                basic_minutes = VALUES(basic_minutes),
                extra_unit_fee = VALUES(extra_unit_fee),
                extra_unit_min = VALUES(extra_unit_min),
                day_max_fee = VALUES(day_max_fee),
                pay_type = VALUES(pay_type),
                weekday_start = VALUES(weekday_start),
                weekday_end = VALUES(weekday_end),
                weekend_start = VALUES(weekend_start),
                weekend_end = VALUES(weekend_end),
                holiday_start = VALUES(holiday_start),
                holiday_end = VALUES(holiday_end),
                updated_at = VALUES(updated_at)
            """;

    private final JdbcTemplate jdbcTemplate;

    public void upsertAll(List<ParkingLot> parkingLots) {
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.batchUpdate(UPSERT_SQL, parkingLots, parkingLots.size(), (ps, parkingLot) -> {
            ps.setString(1, parkingLot.getPkltCd());
            ps.setString(2, parkingLot.getName());
            ps.setString(3, parkingLot.getAddress());
            ps.setString(4, parkingLot.getDistrict());
            ps.setString(5, parkingLot.getTel());
            ps.setString(6, name(parkingLot.getParkingKind()));
            ps.setString(7, name(parkingLot.getOperType()));
            ps.setObject(8, parkingLot.getTotalSlots());
            ps.setObject(9, parkingLot.getFee().basicFee());
            ps.setObject(10, parkingLot.getFee().basicMinutes());
            ps.setObject(11, parkingLot.getFee().extraUnitFee());
            ps.setObject(12, parkingLot.getFee().extraUnitMin());
            ps.setObject(13, parkingLot.getFee().dayMaxFee());
            ps.setString(14, name(parkingLot.getPayType()));
            ps.setString(15, parkingLot.getOperatingHours().weekdayStart());
            ps.setString(16, parkingLot.getOperatingHours().weekdayEnd());
            ps.setString(17, parkingLot.getOperatingHours().weekendStart());
            ps.setString(18, parkingLot.getOperatingHours().weekendEnd());
            ps.setString(19, parkingLot.getOperatingHours().holidayStart());
            ps.setString(20, parkingLot.getOperatingHours().holidayEnd());
            ps.setBoolean(21, parkingLot.isRealtimeAvailable());
            ps.setObject(22, now);
            ps.setObject(23, now);
        });
    }

    private String name(Enum<?> value) {
        if (value == null) {
            return null;
        }

        return value.name();
    }
}

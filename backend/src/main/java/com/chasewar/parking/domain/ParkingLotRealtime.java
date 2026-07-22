package com.chasewar.parking.domain;

import com.chasewar.global.domain.BaseEntity;
import com.chasewar.global.exception.ChasewarException;
import com.chasewar.global.exception.errorcode.InternalServerErrorCode;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class ParkingLotRealtime extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String pkltCd;

    private int totalSlots;

    private int availableSlots;

    private LocalDateTime sourceUpdatedAt;

    public ParkingLotRealtime(String pkltCd, int totalSlots, int availableSlots, LocalDateTime sourceUpdatedAt) {
        if (pkltCd == null || pkltCd.isBlank()) {
            throw new ChasewarException(InternalServerErrorCode.MISSING_PARKING_LOT_CODE);
        }
        if (totalSlots < 0) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_TOTAL_SLOTS);
        }
        if (availableSlots < 0 || availableSlots > totalSlots) {
            throw new ChasewarException(InternalServerErrorCode.INVALID_AVAILABLE_SLOTS);
        }
        this.pkltCd = pkltCd;
        this.totalSlots = totalSlots;
        this.availableSlots = availableSlots;
        this.sourceUpdatedAt = sourceUpdatedAt;
    }
}

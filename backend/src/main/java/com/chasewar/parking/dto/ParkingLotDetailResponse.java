package com.chasewar.parking.dto;

import com.chasewar.parking.domain.vo.RealtimeStatus;
import com.chasewar.parking.repository.dto.ParkingLotDetailProjection;
import java.time.LocalDateTime;

public record ParkingLotDetailResponse(
        Long id,
        String name,
        String address,
        String tel,
        String parkingKind,
        String operType,
        Integer totalSlots,
        String payType,
        FeeResponse fee,
        OperatingHoursResponse operatingHours,
        RealtimeResponse realtimeInfo
) {

    public static ParkingLotDetailResponse from(ParkingLotDetailProjection projection) {
        return new ParkingLotDetailResponse(
                projection.id(),
                projection.name(),
                projection.address(),
                projection.tel(),
                projection.parkingKind().name(),
                projection.operType().name(),
                resolveTotalSlots(projection),
                projection.payType().name(),
                FeeResponse.from(projection.fee()),
                OperatingHoursResponse.from(projection.operatingHours()),
                RealtimeResponse.from(projection)
        );
    }

    private static Integer resolveTotalSlots(ParkingLotDetailProjection projection) {
        if (projection.realtimeTotalSlots() != null) {
            return projection.realtimeTotalSlots();
        }

        return projection.totalSlots();
    }

    public record RealtimeResponse(
            int availableSlots,
            int totalSlots,
            String status,
            LocalDateTime sourceUpdatedAt
    ) {

        private static RealtimeResponse from(ParkingLotDetailProjection projection) {
            if (projection.availableSlots() == null) {
                return null;
            }

            return new RealtimeResponse(
                    projection.availableSlots(),
                    projection.realtimeTotalSlots(),
                    RealtimeStatus.of(projection.availableSlots(), projection.realtimeTotalSlots()).name(),
                    projection.sourceUpdatedAt()
            );
        }
    }
}

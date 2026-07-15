package com.chasewar.parking.domain;

import com.chasewar.global.domain.BaseEntity;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperType;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.ParkingKind;
import com.chasewar.parking.domain.vo.PayType;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class ParkingLot extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String pkltCd;

    private String name;

    private String address;

    private String district;

    private String tel;

    @Enumerated(EnumType.STRING)
    private ParkingKind parkingKind;

    @Enumerated(EnumType.STRING)
    private OperType operType;

    private Integer totalSlots;

    @Embedded
    private Fee fee;

    @Enumerated(EnumType.STRING)
    private PayType payType;

    @Embedded
    private OperatingHours operatingHours;

    @Embedded
    private Coordinates coordinates;

    private boolean realtimeAvailable;

    public ParkingLot(String pkltCd,
                      String name,
                      String address,
                      String district,
                      String tel,
                      ParkingKind parkingKind,
                      OperType operType,
                      Integer totalSlots,
                      Fee fee,
                      PayType payType,
                      OperatingHours operatingHours
    ) {
        this.pkltCd = pkltCd;
        this.name = name;
        this.address = address;
        this.district = district;
        this.tel = tel;
        this.parkingKind = parkingKind;
        this.operType = operType;
        this.totalSlots = totalSlots;
        this.fee = fee;
        this.payType = payType;
        this.operatingHours = operatingHours;
    }
}

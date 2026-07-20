package com.chasewar.support.fixture;

import com.chasewar.parking.domain.ParkingLot;
import com.chasewar.parking.domain.vo.Coordinates;
import com.chasewar.parking.domain.vo.Fee;
import com.chasewar.parking.domain.vo.OperType;
import com.chasewar.parking.domain.vo.OperatingHours;
import com.chasewar.parking.domain.vo.ParkingKind;
import com.chasewar.parking.domain.vo.PayType;

public class ParkingLotFixtureBuilder {

    private String pkltCd = "1000001";
    private String name = "테스트용 주차장";
    private String address = "서울특별시 강남구 역삼동 1-2";
    private String district = "강남구";
    private String tel = null;
    private ParkingKind parkingKind = ParkingKind.OUTDOOR;
    private OperType operType = OperType.TIME_BASED;
    private Integer totalSlots = null;
    private Fee fee = new Fee(null, null, null, null, null);
    private PayType payType = PayType.PAID;
    private OperatingHours operatingHours = new OperatingHours(null, null, null, null, null, null);
    private Coordinates coordinates = null;

    private ParkingLotFixtureBuilder() {
    }

    public static ParkingLotFixtureBuilder builder() {
        return new ParkingLotFixtureBuilder();
    }

    public ParkingLotFixtureBuilder pkltCd(String pkltCd) {
        this.pkltCd = pkltCd;
        return this;
    }

    public ParkingLotFixtureBuilder name(String name) {
        this.name = name;
        return this;
    }

    public ParkingLotFixtureBuilder coordinates(Coordinates coordinates) {
        this.coordinates = coordinates;
        return this;
    }

    public ParkingLot build() {
        ParkingLot parkingLot = new ParkingLot(
                pkltCd,
                name,
                address,
                district,
                tel,
                parkingKind,
                operType,
                totalSlots,
                fee,
                payType,
                operatingHours
        );
        if (coordinates != null) {
            parkingLot.assignCoordinates(coordinates);
        }
        return parkingLot;
    }
}

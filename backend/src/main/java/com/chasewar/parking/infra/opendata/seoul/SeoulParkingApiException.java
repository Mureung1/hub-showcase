package com.chasewar.parking.infra.opendata.seoul;

public class SeoulParkingApiException extends RuntimeException {

    public SeoulParkingApiException(String code, String message) {
        super("서울시 공영주차장 OpenAPI(OA-13122) 오류: code=" + code + ", message=" + message);
    }
}

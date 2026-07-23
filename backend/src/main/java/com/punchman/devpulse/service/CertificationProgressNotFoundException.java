package com.punchman.devpulse.service;

public class CertificationProgressNotFoundException extends RuntimeException {

    public CertificationProgressNotFoundException(Long id) {
        super("'" + id + "'에 해당하는 진행 상황을 찾을 수 없습니다.");
    }
}

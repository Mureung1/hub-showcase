package com.punchman.devpulse.service;

public class CertificationNotFoundException extends RuntimeException {

    public CertificationNotFoundException(Long certificationId) {
        super("'" + certificationId + "'에 해당하는 자격증을 찾을 수 없습니다.");
    }
}

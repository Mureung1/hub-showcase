package com.punchman.devpulse.service;

public class DuplicateCertificationProgressException extends RuntimeException {

    public DuplicateCertificationProgressException(Long certificationId) {
        super("'" + certificationId + "'는 이미 추적 중인 자격증입니다.");
    }
}

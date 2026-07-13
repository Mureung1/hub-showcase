package com.punchman.devpulse.service;

public class CertificationRankingNotFoundException extends RuntimeException {

    public CertificationRankingNotFoundException(String jobTitle) {
        super("'" + jobTitle + "'에 대한 자격증 데이터를 찾을 수 없습니다.");
    }
}

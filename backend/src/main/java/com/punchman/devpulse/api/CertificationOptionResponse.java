package com.punchman.devpulse.api;

import com.punchman.devpulse.domain.Certification;

public record CertificationOptionResponse(Long id, String name, String issuer) {

    public static CertificationOptionResponse from(Certification certification) {
        return new CertificationOptionResponse(
                certification.getId(), certification.getName(), certification.getIssuer());
    }
}

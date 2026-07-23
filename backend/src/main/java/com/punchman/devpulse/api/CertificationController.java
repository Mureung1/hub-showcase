package com.punchman.devpulse.api;

import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/certifications")
@RequiredArgsConstructor
public class CertificationController {

    private final CertificationRepository certificationRepository;

    @GetMapping
    public List<CertificationOptionResponse> getAll() {
        return certificationRepository.findAll().stream()
                .map(CertificationOptionResponse::from)
                .toList();
    }
}

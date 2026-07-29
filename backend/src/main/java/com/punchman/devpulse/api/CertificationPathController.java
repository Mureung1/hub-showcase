package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationPathService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/certification-path")
@RequiredArgsConstructor
public class CertificationPathController {

    private final CertificationPathService certificationPathService;

    @GetMapping
    public CertificationPathResponse computeOrder(@RequestParam List<Long> certificationIds) {
        if (certificationIds.size() < 2) {
            throw new IllegalArgumentException("경로를 계산하려면 자격증을 2개 이상 선택해주세요.");
        }
        return CertificationPathResponse.from(certificationPathService.computeOrder(certificationIds));
    }
}

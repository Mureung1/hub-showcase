package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationRankingService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/certification")
@RequiredArgsConstructor
public class CertificationRankingController {

    private final CertificationRankingService certificationRankingService;

    @GetMapping
    public List<CertificationRankingResponse> getRanking(@RequestParam String jobTitle) {
        if (jobTitle.isBlank()) {
            throw new IllegalArgumentException("jobTitle 파라미터가 필요합니다.");
        }
        return certificationRankingService.rankByJobTitle(jobTitle).stream()
                .map(CertificationRankingResponse::from)
                .toList();
    }
}

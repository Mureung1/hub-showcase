package com.punchman.devpulse.api;

import com.punchman.devpulse.collector.alio.AlioJobPostingCollectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/job-postings")
@RequiredArgsConstructor
public class JobPostingCollectionController {

    private final AlioJobPostingCollectorService alioJobPostingCollectorService;

    @PostMapping("/collect")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void collect(@RequestParam String jobTitle) {
        if (jobTitle.isBlank()) {
            throw new IllegalArgumentException("jobTitle 파라미터가 필요합니다.");
        }
        alioJobPostingCollectorService.collectAndPublish(jobTitle);
    }
}

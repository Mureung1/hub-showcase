package com.agent.student_agent.controller;

import com.agent.student_agent.service.CrawlerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/crawler")
@RequiredArgsConstructor
public class CrawlerController {

    private final CrawlerService crawlerService;

    @PostMapping("/run")
    public ResponseEntity<String> runCrawler() {
        crawlerService.triggerCrawlingManually();
        return ResponseEntity.ok("Crawling job triggered successfully.");
    }
}

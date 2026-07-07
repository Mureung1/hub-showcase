package com.agent.student_agent.controller;

import com.agent.student_agent.domain.ActionItem;
import com.agent.student_agent.domain.Member;
import com.agent.student_agent.domain.RawInformation;
import com.agent.student_agent.repository.ActionItemRepository;
import com.agent.student_agent.repository.MemberRepository;
import com.agent.student_agent.repository.RawInformationRepository;
import com.agent.student_agent.service.CrawlerService;
import com.agent.student_agent.service.LlmPipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 프론트엔드 연동을 위해 모든 CORS 허용
public class DashboardController {

    private final ActionItemRepository actionItemRepository;
    private final RawInformationRepository rawInformationRepository;
    private final MemberRepository memberRepository;
    private final LlmPipelineService llmPipelineService;
    private final CrawlerService crawlerService;

    @GetMapping("/trigger-llm")
    public ResponseEntity<String> triggerLlm() {
        llmPipelineService.processRawInformationWithLlm();
        return ResponseEntity.ok("LLM Pipeline triggered successfully.");
    }

    @GetMapping("/trigger-crawler")
    public ResponseEntity<String> triggerCrawler() {
        crawlerService.triggerCrawlingManually();
        return ResponseEntity.ok("Crawler triggered successfully.");
    }

    @GetMapping("/action-items")
    public ResponseEntity<List<ActionItem>> getActionItems() {
        // MVP: 첫번째 멤버 가져오기
        Member member = memberRepository.findAll().stream().findFirst().orElseGet(() -> {
            Member newMember = Member.builder()
                .email("test@example.com")
                .password("dummy")
                .name("John Doe")
                .build();
            return memberRepository.save(newMember);
        });
        
        List<ActionItem> items = actionItemRepository.findByMemberIdAndIsCompletedFalseOrderByPriorityScoreDesc(member.getId());
        return ResponseEntity.ok(items);
    }
    
    @GetMapping("/raw-infos")
    public ResponseEntity<List<RawInformation>> getRawInfos() {
        List<RawInformation> infos = rawInformationRepository.findTop5ByOrderByCreatedAtDesc();
        return ResponseEntity.ok(infos);
    }

    @PutMapping("/action-items/{id}/complete")
    public ResponseEntity<Void> completeActionItem(@PathVariable Long id) {
        actionItemRepository.findById(id).ifPresent(item -> {
            item.setIsCompleted(true);
            actionItemRepository.save(item);
        });
        return ResponseEntity.ok().build();
    }

    @PostMapping("/resolve-conflict")
    public ResponseEntity<Void> resolveConflict() {
        // MVP: 모든 ActionItem의 마감일을 3일 뒤로 미뤄버림
        List<ActionItem> items = actionItemRepository.findAll();
        for (ActionItem item : items) {
            if (item.getActionDeadline() != null) {
                item.setActionDeadline(item.getActionDeadline().plusDays(3));
                actionItemRepository.save(item);
            }
        }
        return ResponseEntity.ok().build();
    }
}

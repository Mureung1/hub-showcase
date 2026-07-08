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
                // Set scheduledStart and scheduledEnd for calendar demonstration
                item.setScheduledStart(item.getActionDeadline().minusHours(2));
                item.setScheduledEnd(item.getActionDeadline());
                actionItemRepository.save(item);
            }
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/calendar-events")
    public ResponseEntity<List<Map<String, Object>>> getCalendarEvents() {
        Member member = memberRepository.findAll().stream().findFirst().orElse(null);
        if (member == null) return ResponseEntity.ok(List.of());
        
        List<ActionItem> items = actionItemRepository.findAll();
        List<Map<String, Object>> events = items.stream()
            .map(item -> {
                Map<String, Object> event = new HashMap<>();
                event.put("id", item.getId());
                event.put("title", item.getActionTitle());
                if (item.getScheduledStart() != null) {
                    event.put("start", item.getScheduledStart());
                    event.put("end", item.getScheduledEnd());
                } else if (item.getActionDeadline() != null) {
                    event.put("start", item.getActionDeadline().minusHours(2));
                    event.put("end", item.getActionDeadline());
                }
                return event;
            })
            .filter(event -> event.containsKey("start"))
            .toList();
            
        return ResponseEntity.ok(events);
    }

    @PostMapping("/action-items")
    public ResponseEntity<ActionItem> createManualActionItem(@RequestBody Map<String, Object> payload) {
        Member member = memberRepository.findAll().stream().findFirst().orElse(null);
        if (member == null) return ResponseEntity.badRequest().build();

        String title = (String) payload.get("title");
        String startStr = (String) payload.get("start"); // ISO date string
        String endStr = (String) payload.get("end");

        java.time.LocalDateTime start = java.time.LocalDateTime.parse(startStr.replace("Z", ""));
        java.time.LocalDateTime end = java.time.LocalDateTime.parse(endStr.replace("Z", ""));

        ActionItem newItem = ActionItem.builder()
            .member(member)
            .actionTitle(title)
            .category("MANUAL")
            .priorityScore(50.0) // Default priority
            .irreversibility("medium") // Default for conflict resolution inclusion
            .scheduledStart(start)
            .scheduledEnd(end)
            .actionDeadline(end) // Consider the end time as the deadline
            .isCompleted(false)
            .build();

        ActionItem savedItem = actionItemRepository.save(newItem);
        return ResponseEntity.ok(savedItem);
    }

    @PostMapping("/sync-google")
    public ResponseEntity<Void> syncGoogleCalendar() {
        System.out.println("Google Calendar Sync requested via API.");
        return ResponseEntity.ok().build();
    }
}

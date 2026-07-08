package com.agent.student_agent.service;

import com.agent.student_agent.domain.ActionItem;
import com.agent.student_agent.domain.Member;
import com.agent.student_agent.domain.RawInformation;
import com.agent.student_agent.repository.ActionItemRepository;
import com.agent.student_agent.repository.MemberRepository;
import com.agent.student_agent.repository.RawInformationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LlmPipelineService {

    private final RawInformationRepository rawInformationRepository;
    private final ActionItemRepository actionItemRepository;
    private final MemberRepository memberRepository;
    
    @org.springframework.beans.factory.annotation.Value("${ai.enabled:false}")
    private boolean aiEnabled;

    // Optional Injection of ChatModel if we want to use Spring AI directly
    // private final org.springframework.ai.chat.model.ChatModel chatModel;

    /**
     * 아직 ActionItem으로 변환되지 않은 RawInformation들을 조회하여
     * LLM을 거친 것처럼(Mock) ActionItem을 생성합니다.
     */
    @Transactional
    public void processRawInformationWithLlm() {
        log.info("Starting LLM Pipeline to process RawInformation... (AI Enabled: {})", aiEnabled);
        
        List<RawInformation> rawInfos = rawInformationRepository.findAll();
        
        Member member = memberRepository.findAll().stream().findFirst().orElseGet(() -> {
            Member newMember = Member.builder()
                .email("test@example.com")
                .password("dummy")
                .name("John Doe")
                .build();
            return memberRepository.save(newMember);
        });

        for (RawInformation info : rawInfos) {
            String title = info.getTitle();
            if (title == null) continue;

            boolean exists = actionItemRepository.findAll().stream()
                .anyMatch(a -> info.equals(a.getRawInformation()));
            
            if (!exists) {
                ActionItem actionItem;
                if (aiEnabled /* && chatModel != null */) {
                    actionItem = callRealLlm(member, info);
                } else {
                    actionItem = mockLlmReasoning(member, info);
                }
                actionItemRepository.save(actionItem);
                log.info("Created new ActionItem via LLM Pipeline: {}", actionItem.getActionTitle());
            }
        }
    }
    
    private ActionItem callRealLlm(Member member, RawInformation info) {
        log.info("Calling REAL LLM for info: {}", info.getTitle());
        // TODO: ChatModel을 이용한 프롬프트 호출 및 구조화된 데이터(JSON) 응답 파싱 로직 구현
        // String response = chatModel.call("Analyze this notice and give me action items: " + info.getContent());
        // log.info("LLM Response: {}", response);
        
        // 일단 Mock 데이터 반환하도록 Fallback
        return mockLlmReasoning(member, info);
    }

    private ActionItem mockLlmReasoning(Member member, RawInformation info) {
        String title = info.getTitle();
        Double priority = 50.0;
        String irreversibility = "low";
        String rationale = "기한이 여유 있어 보류";
        String category = "NOTICE";
        LocalDateTime deadline = LocalDateTime.now().plusDays(7);
        
        if (info.getSourceType() == com.agent.student_agent.domain.SourceType.CONTEST) {
            if (title.contains("해커톤") || title.contains("공모전") || title.contains("콘테스트")) {
                priority = 80.0;
                irreversibility = "medium";
                category = "CONTEST";
                deadline = LocalDateTime.now().plusDays(14);
                rationale = "해커톤/공모전 키워드가 감지되었습니다. 준비 기간을 고려해 중간 우선순위로 제안합니다.";
            } else if (title.contains("서포터즈") || title.contains("기자단") || title.contains("대외활동")) {
                priority = 70.0;
                irreversibility = "medium";
                category = "EXTRACURRICULAR";
                deadline = LocalDateTime.now().plusDays(10);
                rationale = "서포터즈/기자단 활동입니다. 지원 마감일을 확인하고 서류를 준비하세요.";
            } else {
                priority = 50.0;
                irreversibility = "low";
                category = "ETC";
                deadline = LocalDateTime.now().plusDays(7);
                rationale = "기타 외부 활동/행사입니다. 관심이 있다면 확인해보세요.";
            }
        } else {
            if (title.contains("과제")) {
                priority = 90.0;
                irreversibility = "medium";
                category = "URGENT";
                deadline = LocalDateTime.now().plusDays(1);
                rationale = "과제 마감이 임박했을 수 있습니다. 높은 우선순위로 확인을 권장합니다.";
            } else if (title.contains("장학금")) {
                priority = 85.0;
                irreversibility = "high";
                category = "SCHOLARSHIP";
                deadline = LocalDateTime.now().plusDays(5);
                rationale = "장학금 관련 공지는 기한을 놓치면 치명적이므로 빠르게 확인하세요.";
            } else if (title.contains("이의신청")) {
                priority = 95.0;
                irreversibility = "high";
                category = "URGENT";
                deadline = LocalDateTime.now().plusDays(2);
                rationale = "성적 이의신청은 즉각 대응해야 하는 항목입니다. 가장 높은 우선순위로 지금 당장 확인하세요.";
            }
        }

        return ActionItem.builder()
                .member(member)
                .rawInformation(info)
                .actionTitle(title)
                .priorityScore(priority)
                .category(category)
                .actionDeadline(deadline)
                .irreversibility(irreversibility)
                .resolutionRationale(rationale)
                .isCompleted(false)
                .build();
    }
}

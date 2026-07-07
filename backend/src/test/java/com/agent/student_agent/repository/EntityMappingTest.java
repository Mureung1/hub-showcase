package com.agent.student_agent.repository;

import com.agent.student_agent.domain.ActionItem;
import com.agent.student_agent.domain.Member;
import com.agent.student_agent.domain.RawInformation;
import com.agent.student_agent.domain.SourceType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class EntityMappingTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private RawInformationRepository rawInformationRepository;

    @Autowired
    private ActionItemRepository actionItemRepository;

    @Test
    void testEntityMappingAndSave() {
        // 1. Member 저장
        Member member = Member.builder()
                .email("test@example.com")
                .password("encoded_password_123")
                .name("홍길동")
                .major("컴퓨터공학과")
                .grade(3)
                .interests("AI, 장학금")
                .build();
        Member savedMember = memberRepository.save(member);

        // 2. RawInformation 저장
        RawInformation rawInfo = RawInformation.builder()
                .sourceType(SourceType.SCHOOL_NOTICE)
                .title("2026학년도 2학기 장학금 신청 안내")
                .content("장학금 신청 기간입니다...")
                .url("http://example.com/notice/1")
                .deadline(LocalDateTime.now().plusDays(7))
                .build();
        RawInformation savedRawInfo = rawInformationRepository.save(rawInfo);

        // 3. ActionItem 저장
        ActionItem actionItem = ActionItem.builder()
                .member(savedMember)
                .rawInformation(savedRawInfo)
                .category("Scholarship")
                .actionTitle("장학금 신청서 제출")
                .priorityScore(85.5)
                .actionDeadline(LocalDateTime.now().plusDays(5))
                .isCompleted(false)
                .build();
        ActionItem savedActionItem = actionItemRepository.save(actionItem);

        // 4. 검증
        assertThat(savedMember.getId()).isNotNull();
        assertThat(savedRawInfo.getId()).isNotNull();
        assertThat(savedRawInfo.getCreatedAt()).isNotNull();
        assertThat(savedActionItem.getId()).isNotNull();
        
        // 매핑 검증
        ActionItem foundItem = actionItemRepository.findById(savedActionItem.getId()).get();
        assertThat(foundItem.getMember().getName()).isEqualTo("홍길동");
        assertThat(foundItem.getRawInformation().getSourceType()).isEqualTo(SourceType.SCHOOL_NOTICE);
    }
}

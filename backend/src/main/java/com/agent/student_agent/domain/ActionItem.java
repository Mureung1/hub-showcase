package com.agent.student_agent.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 사용자에게 제안될 행동 단위 엔티티 (Agent Loop: Act 단계)
 * 
 * LLM이 RawInformation을 이해(Understand)하고 행동으로 가공한 뒤,
 * Priority Engine이 우선순위 점수를 부여(Reason)한 최종 결과물입니다.
 * 
 * 대시보드의 'Today's Brief' 영역에 직접적으로 노출됩니다.
 */
@Entity
@Table(name = "action_items")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ActionItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 해당 행동(Action)을 수행해야 할 주체인 사용자
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    /**
     * 이 행동을 도출해낸 원본 정보 (어떤 공지사항/과제 때문에 이 할 일이 생겼는지 추적)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raw_information_id")
    private RawInformation rawInformation;

    /**
     * 행동의 성격/분류 (예: Assignment, Scholarship, Event)
     */
    private String category;
    
    /**
     * 사용자에게 노출될 직관적인 행동 요약문 (예: "운영체제 3차 과제 제출하기")
     */
    @Column(nullable = false)
    private String actionTitle;
    
    /**
     * Priority Engine이 계산한 최종 점수. 
     * 높을수록 대시보드 상단에 배치되고 Notification 대상이 됨.
     */
    private Double priorityScore;
    
    /**
     * AI가 추출 및 확정한 이 행동의 실제 마감 기한
     */
    private LocalDateTime actionDeadline;
    
    /**
     * 사용자가 이 행동을 완료(혹은 무시) 했는지 여부
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isCompleted = false;

    /**
     * 되돌릴 수 없는 정도 (high, medium, low) - Conflict Resolution 판단 근거
     */
    private String irreversibility;

    /**
     * AI가 이 일정을 재배치한 사유 혹은 액션에 대한 이유 텍스트
     */
    @Column(columnDefinition = "TEXT")
    private String resolutionRationale;

    /**
     * AI가 충돌 재배치를 통해 새로 제안한 (혹은 확정된) 캘린더 상의 시작 시간
     */
    private LocalDateTime scheduledStart;

    /**
     * AI가 충돌 재배치를 통해 새로 제안한 (혹은 확정된) 캘린더 상의 종료 시간
     */
    private LocalDateTime scheduledEnd;
}

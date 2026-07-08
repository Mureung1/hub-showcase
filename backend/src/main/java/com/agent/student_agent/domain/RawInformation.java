package com.agent.student_agent.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 수집된 원본 정보 엔티티 (Agent Loop: Observe 단계)
 * 
 * 여러 출처(학교 공지, 학과 공지, 장학금 API, LMS)에서 수집되는 데이터들을 
 * 관리의 용이성과 확장성을 위해 단일 테이블(Single Table)로 통합하여 설계했습니다.
 * 
 * 차후 LLM Pipeline(Understand 단계)에서 이 데이터를 읽어들여 
 * 정형화된 ActionItem으로 가공합니다.
 */
@Entity
@Table(name = "raw_informations")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RawInformation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 수집된 데이터의 출처 구분 (예: SCHOOL_NOTICE, SCHOLARSHIP)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SourceType sourceType;

    /**
     * 원본 게시글 또는 과제의 제목
     */
    @Column(nullable = false)
    private String title;

    /**
     * 원본 게시글의 본문 텍스트 (LLM 요약의 원천 데이터)
     */
    @Column(columnDefinition = "TEXT")
    private String content;

    /**
     * 사용자가 원본을 확인할 수 있는 URL 링크
     */
    @Column(length = 2000)
    private String url;

    /**
     * 수집 당시 원본 텍스트에 명시되어 있던 마감일 (없을 수 있음)
     */
    private LocalDateTime deadline;
    
    /**
     * Agent가 데이터를 최초로 수집한 시스템 시각
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}

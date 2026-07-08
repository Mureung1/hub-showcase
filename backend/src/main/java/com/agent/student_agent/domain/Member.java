package com.agent.student_agent.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * 사용자(학생) 도메인 엔티티
 * 
 * MVP 자체 로그인(이메일/비밀번호)을 지원하며, 사용자의 특성(학과, 학년, 관심사)을 저장합니다.
 * 여기에 저장된 정보들은 AI 파이프라인의 'Reason' 단계에서 
 * 사용자 맞춤형 우선순위(Priority Score)를 계산하기 위한 Interest 파라미터로 활용됩니다.
 */
@Entity
@Table(name = "members")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Member {
    
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 로그인 아이디로 사용될 이메일
     */
    @Column(nullable = false, unique = true)
    private String email;
    
    /**
     * 자체 로그인을 위한 암호화된 비밀번호
     */
    @Column(nullable = false)
    private String password;
    
    /**
     * 학생 이름
     */
    @Column(nullable = false)
    private String name;
    
    /**
     * 학과 (전공) - 전공 관련 공지사항 매칭에 사용됨
     */
    private String major;
    
    /**
     * 학년 - 학년에 맞는 장학금/수강 정보 매칭에 사용됨
     */
    private Integer grade;
    
    /**
     * 사용자의 관심 분야 (예: "AI, 해커톤, 교환학생")
     * 코사인 유사도(Cosine Similarity)를 통해 공지사항과 일치도를 검사할 때 쓰이는 텍스트
     */
    @Column(columnDefinition = "TEXT")
    private String interests;
}

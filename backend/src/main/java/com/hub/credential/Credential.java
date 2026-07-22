package com.hub.credential;

import com.hub.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * F2 — 이력.
 *
 * ── 이번 보강 ──────────────────────────────────────────────
 *  subject (정규화 대상) · depth (관여 깊이) 추가.
 *  evaluator 가 c.getSubject() · c.getDepth() 를 호출한다.
 *  started_on / ended_on 이름은 그대로 둔다 (evaluator 쪽을 맞췄다).
 * ──────────────────────────────────────────────────────────
 */
@Entity
@Table(name = "credentials")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Credential extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CredentialType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String detail;

    /** 정규화된 대상 (python, aws ...). SKILL_USE·자격증 매칭 키. null 이면 임베딩 폴백 */
    @Column(length = 100)
    private String subject;

    /** 관여 깊이. SKILL_USE 충족도의 곱 계수 (MENTIONED 0.3 / USED 0.7 / OWNED 1.0) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Depth depth;

    @Column(name = "started_on")
    private LocalDate startedOn;

    /** null = 재직/진행 중 */
    @Column(name = "ended_on")
    private LocalDate endedOn;

    @Builder
    public Credential(Long userId, CredentialType type, String title, String detail,
                      String subject, Depth depth, LocalDate startedOn, LocalDate endedOn) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.detail = detail;
        this.subject = subject;
        this.depth = depth != null ? depth : Depth.USED;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
    }

    /** F2 수정 — subject/depth 는 정규화/폼 확장 시 별도로 채운다 (호출부 시그니처 유지) */
    public void update(String title, String detail, LocalDate startedOn, LocalDate endedOn) {
        this.title = title;
        this.detail = detail;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
    }

    public boolean isOngoing() {
        return endedOn == null;
    }
}

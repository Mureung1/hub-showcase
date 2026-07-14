package com.hub.credential;

import com.hub.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

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

    @Column(name = "started_on")
    private LocalDate startedOn;

    /** null = 재직/진행 중 */
    @Column(name = "ended_on")
    private LocalDate endedOn;

    @Builder
    public Credential(Long userId, CredentialType type, String title,
                      String detail, LocalDate startedOn, LocalDate endedOn) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.detail = detail;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
    }

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

package com.hub.document;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "generated_docs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GeneratedDoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocStatus status;

    @Column(columnDefinition = "text")
    private String content;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Builder
    public GeneratedDoc(Long userId, Long postingId, DocType type) {
        this.userId = userId;
        this.postingId = postingId;
        this.type = type;
        this.status = DocStatus.PENDING;
    }

    public void start() {
        this.status = DocStatus.RUNNING;
        this.updatedAt = Instant.now();
    }

    public void complete(String content) {
        this.status = DocStatus.DONE;
        this.content = content;
        this.updatedAt = Instant.now();
    }

    public void fail(String message) {
        this.status = DocStatus.FAILED;
        this.errorMessage = message;
        this.updatedAt = Instant.now();
    }

    /** 사용자가 생성 결과를 직접 편집한 경우 */
    public void edit(String content) {
        this.content = content;
        this.updatedAt = Instant.now();
    }
}

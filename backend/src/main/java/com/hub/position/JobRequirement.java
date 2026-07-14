package com.hub.position;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** LLM이 공고 원문에서 뽑아낸 요구조건 (기획서 4.3) */
@Entity
@Table(name = "job_requirements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posting_id", nullable = false)
    private JobPosting posting;

    @Column(nullable = false)
    private String name;

    /** false = 우대 */
    @Column(nullable = false)
    private boolean required;

    /** 0.000 ~ 1.000. 한 공고의 가중치 합은 1.0 */
    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;

    @Builder
    public JobRequirement(String name, boolean required, BigDecimal weight) {
        this.name = name;
        this.required = required;
        this.weight = weight;
    }

    void assignTo(JobPosting posting) {
        this.posting = posting;
    }
}

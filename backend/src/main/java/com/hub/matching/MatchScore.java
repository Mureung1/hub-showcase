package com.hub.matching;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "match_scores")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    /** 0~100. Σ(가중치 × 충족도) × 100 */
    @Column(nullable = false)
    private short score;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt = Instant.now();

    @OneToMany(mappedBy = "matchScore", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MatchDetail> details = new ArrayList<>();

    @Builder
    public MatchScore(Long userId, Long postingId, short score) {
        this.userId = userId;
        this.postingId = postingId;
        this.score = score;
    }

    public void addDetail(MatchDetail detail) {
        details.add(detail);
        detail.assignTo(this);
    }
}

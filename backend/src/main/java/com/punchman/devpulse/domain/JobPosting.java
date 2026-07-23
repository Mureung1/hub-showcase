package com.punchman.devpulse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "job_posting",
        uniqueConstraints = @UniqueConstraint(columnNames = {"recruit_announcement_no", "job_title"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recruit_announcement_no", nullable = false, length = 50)
    private String recruitAnnouncementNo;

    @Column(name = "job_title", nullable = false, length = 100)
    private String jobTitle;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "institution_name", length = 200)
    private String institutionName;

    @Column(name = "application_qualification", columnDefinition = "TEXT")
    private String applicationQualification;

    @Column(name = "preference_condition_summary", columnDefinition = "TEXT")
    private String preferenceConditionSummary;

    @Column(name = "preference_detail", columnDefinition = "TEXT")
    private String preferenceDetail;

    @Column(name = "ncs_classification", length = 500)
    private String ncsClassification;

    @Column(nullable = false)
    private boolean ongoing;

    @Column(name = "announcement_start_date")
    private LocalDate announcementStartDate;

    @Column(name = "announcement_end_date")
    private LocalDate announcementEndDate;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;
}

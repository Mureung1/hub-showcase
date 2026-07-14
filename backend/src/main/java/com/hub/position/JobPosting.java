package com.hub.position;

import com.hub.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_postings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPosting extends BaseEntity {

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String title;

    /** MVP는 BACKEND 하나로 좁힌다 (기획서 8장: 직군 축소 후 확장) */
    @Column(name = "job_category", nullable = false)
    private String jobCategory;

    private String location;
    private String experience;

    @Column(name = "source_url", nullable = false, unique = true)
    private String sourceUrl;

    @Column(name = "raw_content", nullable = false, columnDefinition = "text")
    private String rawContent;

    @OneToMany(mappedBy = "posting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobRequirement> requirements = new ArrayList<>();

    @Builder
    public JobPosting(String company, String title, String jobCategory, String location,
                      String experience, String sourceUrl, String rawContent) {
        this.company = company;
        this.title = title;
        this.jobCategory = jobCategory;
        this.location = location;
        this.experience = experience;
        this.sourceUrl = sourceUrl;
        this.rawContent = rawContent;
    }

    public void addRequirement(JobRequirement requirement) {
        requirements.add(requirement);
        requirement.assignTo(this);
    }
}

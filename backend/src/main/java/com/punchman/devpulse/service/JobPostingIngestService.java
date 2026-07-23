package com.punchman.devpulse.service;

import com.punchman.devpulse.collector.alio.AlioDateParser;
import com.punchman.devpulse.domain.JobPosting;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.repository.jpa.JobPostingRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobPostingIngestService {

    private final JobPostingRepository jobPostingRepository;

    @Transactional
    public void ingest(JobPostingCollectedEvent event) {
        JobPosting jobPosting = jobPostingRepository
                .findByRecruitAnnouncementNoAndJobTitle(event.recrutPblntSn(), event.jobTitle())
                .orElseGet(JobPosting::new);

        jobPosting.setRecruitAnnouncementNo(event.recrutPblntSn());
        jobPosting.setJobTitle(event.jobTitle());
        jobPosting.setTitle(event.recrutPbancTtl());
        jobPosting.setInstitutionName(event.instNm());
        jobPosting.setApplicationQualification(event.aplyQlfcCn());
        jobPosting.setPreferenceConditionSummary(event.prefCondCn());
        jobPosting.setPreferenceDetail(event.prefCn());
        jobPosting.setNcsClassification(event.ncsCdNmLst());
        jobPosting.setOngoing("Y".equals(event.ongoingYn()));
        jobPosting.setAnnouncementStartDate(AlioDateParser.parse(event.pbancBgngYmd()));
        jobPosting.setAnnouncementEndDate(AlioDateParser.parse(event.pbancEndYmd()));
        jobPosting.setCollectedAt(LocalDateTime.now());

        jobPostingRepository.save(jobPosting);
    }
}

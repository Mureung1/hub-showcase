package com.punchman.devpulse.repository.jpa;

import com.punchman.devpulse.domain.JobPosting;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    Optional<JobPosting> findByRecruitAnnouncementNoAndJobTitle(String recruitAnnouncementNo, String jobTitle);

    List<JobPosting> findByJobTitle(String jobTitle);
}

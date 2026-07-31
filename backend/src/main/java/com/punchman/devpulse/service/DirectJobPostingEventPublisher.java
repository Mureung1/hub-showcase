package com.punchman.devpulse.service;

import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.JobPostingEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * prod 프로필 전용 — 무료 배포 환경엔 Kafka가 없어, 컨슈머(JobPostingCollectedConsumer,
 * !prod 전용)가 하던 ingest+recalculate를 Kafka 없이 동기로 그대로 수행한다. 두 클래스의
 * 로직이 사실상 같으니 한쪽을 고치면 다른 쪽도 확인할 것.
 */
@Component
@Profile("prod")
public class DirectJobPostingEventPublisher implements JobPostingEventPublisher {

    private final JobPostingIngestService jobPostingIngestService;
    private final CertificationMentionRecalculationService certificationMentionRecalculationService;

    public DirectJobPostingEventPublisher(
            JobPostingIngestService jobPostingIngestService,
            CertificationMentionRecalculationService certificationMentionRecalculationService) {
        this.jobPostingIngestService = jobPostingIngestService;
        this.certificationMentionRecalculationService = certificationMentionRecalculationService;
    }

    @Override
    public void publish(JobPostingCollectedEvent event) {
        jobPostingIngestService.ingest(event);
        certificationMentionRecalculationService.recalculate(event.jobTitle());
    }
}

package com.punchman.devpulse.kafka;

public interface JobPostingEventPublisher {

    void publish(JobPostingCollectedEvent event);
}

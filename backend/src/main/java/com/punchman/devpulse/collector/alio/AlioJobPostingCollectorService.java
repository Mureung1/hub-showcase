package com.punchman.devpulse.collector.alio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.punchman.devpulse.kafka.JobPostingCollectedEvent;
import com.punchman.devpulse.kafka.KafkaTopics;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class AlioJobPostingCollectorService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final long RECENT_MONTHS = 3;

    private final AlioRecruitInquiryClient alioRecruitInquiryClient;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public AlioJobPostingCollectorService(
            AlioRecruitInquiryClient alioRecruitInquiryClient,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${devpulse.alio.api-key}") String apiKey) {
        this.alioRecruitInquiryClient = alioRecruitInquiryClient;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public int collectAndPublish(String jobTitle) {
        String formBody = AlioFormEncoder.encode(buildRequestParams(jobTitle));
        String rawResponse = alioRecruitInquiryClient.search(formBody);
        List<AlioRecrutItem> items = AlioResponseParser.parseItems(objectMapper, rawResponse);

        LocalDate today = LocalDate.now();
        List<AlioRecrutItem> collectable = items.stream()
                .filter(item -> AlioResponseFilter.isCollectable(item, today, RECENT_MONTHS))
                .toList();

        collectable.forEach(item -> publish(jobTitle, item));
        return collectable.size();
    }

    private Map<String, String> buildRequestParams(String jobTitle) {
        LocalDate today = LocalDate.now();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("key", apiKey);
        params.put("pageNo", "1");
        params.put("numOfRows", "100");
        params.put("recrutPbancTtl", jobTitle);
        params.put("ongoingYn", "Y");
        params.put("pbancBgngYmd", today.minusMonths(RECENT_MONTHS).format(DATE_FORMAT));
        params.put("pbancEndYmd", today.format(DATE_FORMAT));
        return params;
    }

    private void publish(String jobTitle, AlioRecrutItem item) {
        JobPostingCollectedEvent event = new JobPostingCollectedEvent(
                jobTitle,
                String.valueOf(item.recrutPblntSn()),
                item.recrutPbancTtl(),
                item.instNm(),
                item.aplyQlfcCn(),
                item.prefCondCn(),
                item.prefCn(),
                item.ncsCdNmLst(),
                item.ongoingYn(),
                item.pbancBgngYmd(),
                item.pbancEndYmd()
        );
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(KafkaTopics.JOBPOSTING_COLLECTED, payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JobPostingCollectedEvent 직렬화 실패", e);
        }
    }
}

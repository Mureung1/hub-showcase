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

    /**
     * ALIO 검색 폼(recrutInquiryList.do.js의 fn_goOpendataAlioApiDataList)이 항상 보내는 15개
     * 필드(pageNo~pbancEndYmd)를 전부 포함하고, 인증키(key)를 더해 총 16개를 보낸다. 실제로 확인된
     * 사실: 우리가 쓰지 않는 필드(instType 등)를 빈 값으로도 아예 안 보내면(키 자체가 없으면)
     * recrutPbancTtl 검색 조건이 서버에서 무시되고 0건만 반환된다 — 브라우저 "Copy as cURL" 캡처와
     * 최소 헤더만으로 직접 재현해서 확인한 결과, 세션/쿠키/헤더가 아니라 이 15개 필드가 전부
     * 존재해야 한다는 것 자체가 원인이었다.
     */
    private Map<String, String> buildRequestParams(String jobTitle) {
        LocalDate today = LocalDate.now();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("key", apiKey);
        params.put("pageNo", "1");
        params.put("numOfRows", "100");
        params.put("recrutPbancTtl", jobTitle);
        params.put("instType", "");
        params.put("instClsf", "");
        params.put("pblntInstCd", "");
        params.put("ncsCdLst", "");
        params.put("workRgnLst", "");
        params.put("acbgCondLst", "");
        params.put("hireTypeLst", "");
        params.put("recrutSe", "");
        params.put("replmprYn", "");
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

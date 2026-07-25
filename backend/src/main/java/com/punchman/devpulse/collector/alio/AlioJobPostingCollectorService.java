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
        List<String> ncsCodes = AlioJobTitleNcsMapping.codesFor(jobTitle);
        List<AlioRecrutItem> items = ncsCodes.isEmpty()
                ? searchByTitle(jobTitle)
                : searchByNcsCodes(ncsCodes);

        LocalDate today = LocalDate.now();
        List<AlioRecrutItem> collectable = items.stream()
                .filter(item -> AlioResponseFilter.isCollectable(item, today, RECENT_MONTHS))
                .toList();

        collectable.forEach(item -> publish(jobTitle, item));
        return collectable.size();
    }

    /**
     * recrutPbancTtl(제목) 검색은 문구가 실제 공고 제목에 리터럴로 존재해야만 매칭되는 구조적
     * 한계가 있어(실측: 일반적 직무 카테고리 문구는 대부분 0~1건), {@link AlioJobTitleNcsMapping}에
     * 매핑이 있는 jobTitle은 이쪽 대신 NCS 코드 검색으로 간다. 매핑에 없는 jobTitle만 기존 제목
     * 검색을 그대로 사용(이미 실데이터로 검증된 경로를 건드리지 않기 위한 폴백).
     */
    private List<AlioRecrutItem> searchByTitle(String jobTitle) {
        return search(buildRequestParams(jobTitle, ""));
    }

    /**
     * 코드 하나당 개별 요청 후 recrutPblntSn 기준으로 병합·중복 제거한다. ncsCdLst 필드명이
     * "...Lst"로 끝나 콤마 등으로 다중값을 한 번에 받을 가능성이 있지만, 실제 동작을 검증하지
     * 않은 채 추측하면 이번 세션에 이미 두 번(recrutPbancTtl, pbancEndYmd) 겪은 것과 같은 부류의
     * 버그로 이어질 수 있어 검증된 동작(코드당 1요청)만 사용한다. 하나의 공고가 여러 NCS
     * 분류에 동시에 속하는 경우가 실제로 있어(예: ncsCdNmLst에 여러 분류명이 콤마로 함께 나열됨)
     * 병합 시 중복 제거가 필요하다.
     */
    private List<AlioRecrutItem> searchByNcsCodes(List<String> ncsCodes) {
        Map<Long, AlioRecrutItem> merged = new LinkedHashMap<>();
        for (String ncsCode : ncsCodes) {
            for (AlioRecrutItem item : search(buildRequestParams("", ncsCode))) {
                merged.putIfAbsent(item.recrutPblntSn(), item);
            }
        }
        return List.copyOf(merged.values());
    }

    private List<AlioRecrutItem> search(Map<String, String> params) {
        String formBody = AlioFormEncoder.encode(params);
        String rawResponse = alioRecruitInquiryClient.search(formBody);
        return AlioResponseParser.parseItems(objectMapper, rawResponse);
    }

    /**
     * ALIO 검색 폼(recrutInquiryList.do.js의 fn_goOpendataAlioApiDataList)이 항상 보내는 15개
     * 필드(pageNo~pbancEndYmd)를 전부 포함하고, 인증키(key)를 더해 총 16개를 보낸다. 실제로 확인된
     * 사실: 우리가 쓰지 않는 필드(instType 등)를 빈 값으로도 아예 안 보내면(키 자체가 없으면)
     * recrutPbancTtl 검색 조건이 서버에서 무시되고 0건만 반환된다 — 브라우저 "Copy as cURL" 캡처와
     * 최소 헤더만으로 직접 재현해서 확인한 결과, 세션/쿠키/헤더가 아니라 이 15개 필드가 전부
     * 존재해야 한다는 것 자체가 원인이었다.
     *
     * pbancBgngYmd/pbancEndYmd는 "공고 게시기간" 조회 범위다. ongoingYn=Y(진행중인 공고만)와
     * 함께 쓸 때 pbancEndYmd를 오늘 날짜로 고정하면, 아직 마감 전이라 종료일이 미래인 진행중
     * 공고가 전부 이 상한선에 걸려 제외되어 0건만 반환된다(실제 ALIO 서버로 직접 검증:
     * 같은 키워드가 ongoingYn=Y 없이는 결과가 나오지만 pbancEndYmd=오늘과 결합하면 0건).
     * 그래서 종료일 상한은 미래로 열어둔다.
     */
    private Map<String, String> buildRequestParams(String recrutPbancTtl, String ncsCdLst) {
        LocalDate today = LocalDate.now();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("key", apiKey);
        params.put("pageNo", "1");
        params.put("numOfRows", "100");
        params.put("recrutPbancTtl", recrutPbancTtl);
        params.put("instType", "");
        params.put("instClsf", "");
        params.put("pblntInstCd", "");
        params.put("ncsCdLst", ncsCdLst);
        params.put("workRgnLst", "");
        params.put("acbgCondLst", "");
        params.put("hireTypeLst", "");
        params.put("recrutSe", "");
        params.put("replmprYn", "");
        params.put("ongoingYn", "Y");
        params.put("pbancBgngYmd", today.minusMonths(RECENT_MONTHS).format(DATE_FORMAT));
        params.put("pbancEndYmd", today.plusMonths(RECENT_MONTHS).format(DATE_FORMAT));
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

package com.agent.student_agent.service;

import com.agent.student_agent.domain.RawInformation;
import com.agent.student_agent.domain.SourceType;
import com.agent.student_agent.repository.RawInformationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlerService {

    private final RawInformationRepository rawInformationRepository;

    // 위비티 대외활동/공모전 URL (예시)
    private static final String TARGET_URL = "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21"; 

    /**
     * 매 시간마다 크롤링 실행 (3600000ms = 1시간)
     */
    @Scheduled(fixedDelay = 3600000)
    public void crawlNotices() {
        log.info("Starting Wevity crawling job...");
        
        try {
            Document doc = Jsoup.connect(TARGET_URL).get();
            Elements items = doc.select("ul.list li:not(.top)");
            
            log.info("Found {} items from Wevity", items.size());
            
            for (Element item : items) {
                Element linkElement = item.selectFirst(".tit a");
                if (linkElement != null) {
                    String title = linkElement.ownText().trim();
                    String relativeHref = linkElement.attr("href");
                    String fullUrl = "https://www.wevity.com/" + relativeHref;
                    
                    // 서브 타이틀에서 본문 내용을 조금 긁어옴
                    Element subTitElement = item.selectFirst(".tit .sub-tit");
                    String content = subTitElement != null ? subTitElement.text() : "내용 없음";
                    
                    // DB 중복 체크 후 저장 (URL 기준)
                    boolean exists = rawInformationRepository.findAll().stream()
                            .anyMatch(r -> fullUrl.equals(r.getUrl()));
                    
                    if (!exists) {
                        saveIfNotExists(SourceType.CONTEST, title, content, fullUrl);
                    }
                }
            }

            log.info("Wevity Crawling job completed.");
        } catch (Exception e) {
            log.error("Error occurred during Wevity crawling: ", e);
        }
    }
    
    private void saveIfNotExists(SourceType type, String title, String content, String url) {
        RawInformation raw = RawInformation.builder()
                .sourceType(type)
                .title(title)
                .content(content)
                .url(url)
                .build();
        rawInformationRepository.save(raw);
        log.info("Saved new contest: {}", title);
    }
    
    // 수동 강제 실행용
    public void triggerCrawlingManually() {
        crawlNotices();
    }
}

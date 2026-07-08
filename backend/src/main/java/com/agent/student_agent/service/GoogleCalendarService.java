package com.agent.student_agent.service;

import com.agent.student_agent.domain.ActionItem;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GoogleCalendarService {

    /**
     * MVP용 Google 캘린더 단방향 동기화 (내보내기) 뼈대
     * 실제 작동을 위해서는 Google Cloud Console에서 OAuth 2.0 클라이언트 ID 및 Secret 발급 필요
     */
    public void exportToGoogleCalendar(List<ActionItem> itemsToSync) {
        // 1. GoogleCredentials 로드 로직
        // 2. Calendar 서비스 인스턴스 생성: new Calendar.Builder(...)
        // 3. itemsToSync 리스트를 순회하며 Google Event 객체로 변환
        // 4. calendar.events().insert("primary", event).execute() 호출하여 구글에 등록

        System.out.println("====== Google Calendar Sync Triggered ======");
        System.out.println("동기화 대상 일정 개수: " + itemsToSync.size());
        for (ActionItem item : itemsToSync) {
            System.out.println("-> 구글 캘린더 전송 준비: " + item.getActionTitle());
        }
        System.out.println("Google Cloud Console에서 발급받은 credentials.json이 필요합니다.");
    }
}

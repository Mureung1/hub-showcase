package com.spendmate.service;

import com.spendmate.domain.Category;
import com.spendmate.domain.ReceiptSourceType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class CategoryClassifier {

    private static final Map<Category, List<String>> KEYWORDS_BY_CATEGORY = Map.of(
            Category.CONVENIENCE_STORE, List.of("GS25", "CU", "씨유", "세븐일레븐", "이마트24", "미니스톱", "EMART24"),
            Category.CAFE, List.of("스타벅스", "이디야", "투썸", "메가커피", "컴포즈", "빽다방", "폴바셋", "커피빈", "카페", "커피"),
            Category.MEAL_KIT, List.of("프레시지", "마켓컬리", "컬리", "쿠캣", "밀키트"),
            Category.CAMPUS_MEAL, List.of("학생회관", "학식", "기숙사식당", "교내식당", "생활관식당"),
            Category.DELIVERY, List.of("배달의민족", "배민", "요기요", "쿠팡이츠", "땡겨요", "위메프오"),
            Category.SHOPPING, List.of("쿠팡", "11번가", "지마켓", "옥션", "무신사", "올리브영", "다이소"),
            Category.MART, List.of("마트", "하나로", "홈플러스", "농협", "슈퍼", "코스트코", "롯데마트")
    );

    // 검사 순서가 중요함 — 예를 들어 "이마트24"는 CONVENIENCE_STORE를 먼저 확인해야
    // MART의 "마트" 키워드에 걸려서 잘못 분류되는 걸 막을 수 있음.
    private static final List<Category> PRIORITY_ORDER = List.of(
            Category.CONVENIENCE_STORE, Category.CAFE, Category.MEAL_KIT,
            Category.CAMPUS_MEAL, Category.DELIVERY, Category.SHOPPING, Category.MART
    );

    public Category classify(String storeName, ReceiptSourceType sourceType) {
        if (storeName != null) {
            String normalized = storeName.toUpperCase();
            for (Category category : PRIORITY_ORDER) {
                for (String keyword : KEYWORDS_BY_CATEGORY.get(category)) {
                    if (normalized.contains(keyword.toUpperCase())) {
                        return category;
                    }
                }
            }
        }
        // 상호명에서 못 찾으면, 주문내역 캡처는 배달인 경우가 대부분이라 배달로 추정
        return sourceType == ReceiptSourceType.ORDER_SCREEN ? Category.DELIVERY : Category.OTHER;
    }
}

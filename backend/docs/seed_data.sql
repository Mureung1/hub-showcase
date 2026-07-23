-- ===================================
-- ShortsGen Seed Data
-- ===================================

-- 트렌드 키워드 초기화
INSERT INTO trend_keywords (keyword, category, search_volume, trend_date, platform) VALUES
('#신메뉴', '음식', 15000, NOW(), 'instagram'),
('#카페', '카페', 25000, NOW(), 'instagram'),
('#디저트', '음식', 18000, NOW(), 'tiktok'),
('#음식점', '음식', 12000, NOW(), 'instagram'),
('#라떼', '음료', 8500, NOW(), 'instagram'),
('#핸드드립', '카페', 7200, NOW(), 'tiktok'),
('#겉바속촉', '음식', 14500, NOW(), 'tiktok'),
('#빵지순례', '음식', 11000, NOW(), 'instagram'),
('#카페감성', '카페', 9800, NOW(), 'instagram'),
('#틱톡영상', '일반', 32000, NOW(), 'tiktok'),
('#릴스챌린지', '일반', 28000, NOW(), 'instagram'),
('#쇼츠', '일반', 26000, NOW(), 'youtube'),
('#트렌드', '일반', 50000, NOW(), 'all'),
('#바이럴', '마케팅', 19000, NOW(), 'all'),
('#숏폼', '일반', 22000, NOW(), 'all');

-- 샘플 가게 정보
INSERT INTO store_info (store_name, category, location, signature_menu, created_at, updated_at) VALUES
('카페 에스프레소', '카페', '서울 강남구', '핸드드립 커피', NOW(), NOW()),
('라면왕', '음식점', '서울 명동', '신라면', NOW(), NOW()),
('디저트팜', '베이커리', '부산 해운대', '생크림 케이크', NOW(), NOW()),
('오마카세 초밥', '일식당', '서울 강남구', '참치 대토로', NOW(), NOW()),
('피자 매직', '이탈리안', '인천 연수구', '불고기 피자', NOW(), NOW());

-- 샘플 발행 기록
INSERT INTO published_videos (video_id, store_id, platform, title, hashtags, published_at) VALUES
(1, 1, 'draft', '신 블루베리 라떼', '#라떼 #신메뉴 #카페감성', NOW()),
(2, 1, 'instagram', '핸드드립 커피 제조 과정', '#핸드드립 #카페 #일상', NOW() - INTERVAL '2 days'),
(3, 2, 'tiktok', '라면왕의 신 메뉴 공개', '#라면 #신메뉴 #먹방', NOW() - INTERVAL '5 days'),
(4, 3, 'instagram', '생크림 케이크 슬라이스', '#디저트 #케이크 #바이럴', NOW() - INTERVAL '1 days'),
(5, 4, 'draft', '오마카세 참치 대토로', '#초밥 #일식 #럭셔리', NOW());

-- 샘플 생성된 영상
INSERT INTO generated_videos (store_id, video_url, thumbnail_url, caption, hashtags, created_at) VALUES
(1, '/ai-output/video_1234567890.mp4', '/ai-output/thumbnail_1234567890.jpg', '블루베리 라떼의 모든 것', '#라떼 #신메뉴 #카페', NOW()),
(2, '/ai-output/video_2345678901.mp4', '/ai-output/thumbnail_2345678901.jpg', '라면왕 신메뉴 공개', '#라면 #신메뉴', NOW() - INTERVAL '1 hours'),
(3, '/ai-output/video_3456789012.mp4', '/ai-output/thumbnail_3456789012.jpg', '생크림 케이크 샤샤샥', '#디저트 #케이크', NOW() - INTERVAL '2 hours');

-- 샘플 생성 작업
INSERT INTO generation_jobs (store_id, status, result_video_url, metadata, created_at, updated_at) VALUES
(1, 'completed', '/ai-output/video_1234567890.mp4', '{"purpose":"신메뉴 소개","mood":"bright","trend":"#라떼"}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(2, 'completed', '/ai-output/video_2345678901.mp4', '{"purpose":"신메뉴 소개","mood":"friendly","trend":"#라면"}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(3, 'completed', '/ai-output/video_3456789012.mp4', '{"purpose":"신메뉴 소개","mood":"elegant","trend":"#디저트"}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- ===================================
-- 참고: 다음 명령어로 실행하세요
-- ===================================
-- psql -h [SUPABASE_HOST] -U postgres -d postgres -f docs/seed_data.sql
-- 또는 Supabase SQL Editor에서 복사+붙여넣기

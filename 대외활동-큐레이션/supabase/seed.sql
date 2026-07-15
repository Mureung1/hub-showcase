-- Supabase SQL Editor에 붙여넣어 실행하면 postings에 공고 14건이 들어간다.
-- (먼저 docs/schema.md의 CREATE TABLE로 raw_postings, postings 테이블을 만들어 둘 것)
-- id는 uuid로 자동 생성된다. eligibility(JSONB)의 모양은 프론트 mock과 같아 match.js가 그대로 동작한다.

insert into postings (title, org, category, track, source, url, deadline, posted_at, parse_status, eligibility) values
('대학생 IT 서포터즈 12기', 'OO소프트', '대외활동', 'activity', '링커리어', 'https://linkareer.com/activity/1', '2026-07-22', '2026-07-11', 'curated',
 '{"grades":[],"majors":["IT"],"regions":[],"enrollment":["재학"],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"IT 계열 재학생 대상. 학년·지역 무관."}'),
('청년 창업 아이디어 공모전', '창업진흥원', '공모전', 'activity', '콘테스트코리아', 'https://contestkorea.com/2', '2026-08-05', '2026-06-25', 'curated',
 '{"grades":[],"majors":[],"regions":[],"enrollment":[],"ageMin":19,"ageMax":34,"incomeMax":null,"gpaMin":null,"text":"만 19~34세 청년 누구나 지원 가능."}'),
('서울 청년 활동 지원금', '서울시', '장학', 'scholarship', '온통청년', 'https://youthcenter.go.kr/3', '2026-07-30', '2026-07-12', 'needs_review',
 '{"grades":[],"majors":[],"regions":[],"enrollment":["재학"],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"자격요건 원문이 우대·필수 구분 없이 적혀 있어 확인이 필요함."}'),
('지역아동센터 교육봉사', '지역아동센터', '봉사', 'activity', '1365', 'https://1365.go.kr/4', '2026-07-28', '2026-07-08', 'curated',
 '{"grades":[],"majors":[],"regions":["서울","경기","인천"],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"수도권(서울·경기·인천) 거주자, 주 1회 이상 참여 가능자."}'),
('공학 전공심화 학회 지원사업', '□□대학교', '대외활동', 'activity', '대학공지', 'https://example.ac.kr/5', '2026-07-25', '2026-07-09', 'curated',
 '{"grades":[3,4],"majors":["과학","IT"],"regions":[],"enrollment":["재학"],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"3~4학년 이공계(과학·IT) 재학생."}'),
('부산 청년 문화기획단', '부산광역시', '대외활동', 'activity', '온통청년', 'https://youthcenter.go.kr/6', '2026-08-10', '2026-07-13', 'curated',
 '{"grades":[],"majors":[],"regions":["부산"],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"부산 거주 청년."}'),
('이공계 국가우수장학금', '한국장학재단', '장학', 'scholarship', '장학재단', 'https://kosaf.go.kr/7', '2026-07-24', '2026-07-05', 'curated',
 '{"grades":[1,2],"majors":["과학","IT","의학"],"regions":[],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":8,"gpaMin":3.5,"text":"1~2학년 이공계, 소득 8분위 이하, 직전 학기 3.5 이상."}'),
('성적우수 재학생 장학금', '◎◎재단', '장학', 'scholarship', '장학재단', 'https://example.org/8', '2026-08-01', '2026-07-10', 'needs_review',
 '{"grades":[],"majors":[],"regions":[],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":4.0,"text":"직전 학기 평점 기준이 첨부 이미지에만 있어 원문 확인이 필요함."}'),
('브랜드 마케팅 아이디어 공모전', '☆☆기업', '공모전', 'activity', '콘테스트코리아', 'https://contestkorea.com/9', '2026-08-03', '2026-07-12', 'curated',
 '{"grades":[],"majors":["경영"],"regions":[],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"경영·마케팅 계열 대상."}'),
('신입생 서포터즈', '△△대학교', '대외활동', 'activity', '링커리어', 'https://linkareer.com/activity/10', '2026-07-26', '2026-07-07', 'curated',
 '{"grades":[1],"majors":[],"regions":[],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"1학년 신입생 대상."}'),
('지역인재 육성 장학', '지방장학재단', '장학', 'scholarship', '온통청년', 'https://youthcenter.go.kr/11', '2026-07-29', '2026-07-11', 'curated',
 '{"grades":[],"majors":[],"regions":["강원","충청","전라","경상"],"enrollment":["재학"],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"비수도권 소재 대학 재학생."}'),
('저소득 예술계열 장학', '예술위원회', '장학', 'scholarship', '장학재단', 'https://example.org/12', '2026-08-02', '2026-07-06', 'curated',
 '{"grades":[],"majors":["예술"],"regions":["부산"],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":4,"gpaMin":null,"text":"부산 소재 예술계열, 소득 4분위 이하."}'),
('대학원 진학 연구지원', '연구재단', '장학', 'scholarship', '장학재단', 'https://example.org/13', '2026-08-08', '2026-07-13', 'curated',
 '{"grades":[],"majors":["의학"],"regions":[],"enrollment":["졸업예정"],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"졸업예정 의학계열."}'),
('마감 지난 공모전 예시', 'XX', '공모전', 'activity', '콘테스트코리아', 'https://contestkorea.com/14', '2026-07-05', '2026-06-30', 'curated',
 '{"grades":[],"majors":[],"regions":[],"enrollment":[],"ageMin":null,"ageMax":null,"incomeMax":null,"gpaMin":null,"text":"이미 마감된 공고(목록에서 자동으로 빠져야 함)."}');

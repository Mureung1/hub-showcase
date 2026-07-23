-- 성분 설명(description)을 식약처 "건강기능식품 품목분류정보"(I2710) API 기준
-- 실제 공식 인정 기능성 문구로 교체. 상한섭취량(upper_limit_mg)은 KDRI 기준 그대로 유지
-- (이 API의 1일 섭취량 범위는 "효능을 주장하기 위한 표시기준"이지 안전 상한선이 아니므로 별개로 취급).

UPDATE ingredients SET description = '에너지 이용, 신경과 근육 기능 유지에 필요' WHERE name = '마그네슘';
UPDATE ingredients SET description = '유산균 증식 및 유해균 억제, 배변활동 원활, 장 건강에 도움' WHERE name = '프로바이오틱스';
UPDATE ingredients SET description = '노화로 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움' WHERE name = '루테인';
UPDATE ingredients SET description = '혈중 중성지질 개선, 혈행 개선, 기억력 개선, 눈 건강(건조한 눈 개선)에 도움' WHERE name = '오메가3';
UPDATE ingredients SET description = '칼슘과 인의 흡수·이용, 뼈의 형성과 유지, 골다공증 위험 감소에 도움' WHERE name = '비타민 D';
UPDATE ingredients SET description = '정상적인 면역기능과 세포분열에 필요' WHERE name = '아연';
UPDATE ingredients SET description = '피부 보습, 자외선에 의한 피부손상으로부터 피부 건강 유지에 도움' WHERE name = '콜라겐';
UPDATE ingredients SET description = '체내 에너지 생성에 필요' WHERE name = '니아신';
UPDATE ingredients SET description = '단백질과 아미노산 이용, 혈액의 호모시스테인 수준을 정상으로 유지하는데 필요' WHERE name = '비타민 B6';
UPDATE ingredients SET description = '세포와 혈액 생성, 태아 신경관의 정상 발달, 호모시스테인 수준 정상 유지에 필요' WHERE name = '엽산';

-- 새 성분 4개 추가 (증상 매핑과 함께 연결)
INSERT INTO ingredients (name, category, upper_limit_mg, description) VALUES
  ('비타민 C', '비타민', 2000, '결합조직 형성과 기능 유지, 철 흡수, 항산화 작용에 필요'),
  ('철분', '미네랄', 45, '체내 산소운반과 혈액생성, 에너지 생성에 필요'),
  ('칼슘', '미네랄', 2500, '뼈와 치아 형성, 신경과 근육 기능 유지, 골다공증 위험 감소에 도움'),
  ('비타민 A', '비타민', 3, '어두운 곳에서 시각 적응, 피부와 점막 형성·기능 유지에 필요');

INSERT INTO symptom_ingredients (symptom_id, ingredient_id)
SELECT s.id, i.id FROM symptoms s, ingredients i
WHERE (s.name, i.name) IN (
  ('면역력 저하', '비타민 C'), ('피부 트러블', '비타민 C'),
  ('피로', '철분'),
  ('관절 통증', '칼슘'),
  ('피부 트러블', '비타민 A'), ('눈 피로', '비타민 A')
);

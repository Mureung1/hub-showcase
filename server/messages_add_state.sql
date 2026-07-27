-- messages 테이블에 "이 메시지가 생성될 때의 상태(D_gen 근사치)"를 스냅샷으로 저장할 컬럼 추가.
-- 지금 조회 시점의 최신 tide_checks 값(D_recall)과 비교해서 잠김 여부를 계산한다.
alter table messages add column if not exists valence int;
alter table messages add column if not exists arousal int;

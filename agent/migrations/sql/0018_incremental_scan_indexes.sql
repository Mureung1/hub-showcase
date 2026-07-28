-- 증분 재실행 조회가 쓰는 인덱스.
-- 정의는 docs/erd.md 6.1·7.8 이다.
--
-- 추출·발견·할당의 대상 조회는 이미 처리한 행을 `NOT EXISTS` 로 걸러 낸 뒤에
-- `LIMIT` 을 적용한다. 자른 뒤에 거르면 `--limit` 을 준 재실행이 같은 앞부분을
-- 다시 뽑아 아무것도 진행하지 못한다.
--
-- `requirement_candidate_mentions` 의 기본키는 (candidate_id, mention_id) 이므로
-- mention_id 가 선두 컬럼이 아니다. 발견의 `NOT EXISTS` 가 mention_id 하나로
-- 조회하므로 인덱스가 없으면 행마다 전체 훑기가 된다.
CREATE INDEX IF NOT EXISTS idx_candidate_mentions_mention
  ON requirement_candidate_mentions (mention_id);

-- 추출의 `NOT EXISTS` 는 (chunk_id, dataset_version) 두 컬럼으로 판정한다.
-- 기존 idx_mentions_chunk 로도 동작하지만 dataset_version 확인이 heap 접근을
-- 부른다.
CREATE INDEX IF NOT EXISTS idx_mentions_chunk_dataset
  ON requirement_mentions (chunk_id, dataset_version);

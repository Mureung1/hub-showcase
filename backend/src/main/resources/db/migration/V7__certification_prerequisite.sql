-- 시드 데이터 없음: 시드된 7종 자격증 사이에 검증 가능한 공식 선수조건이 없어
-- 지어낸 데이터를 넣지 않는다(Issue 6과 동일한 원칙). 나중에 실제 검증된
-- 선수조건을 알게 되면 그때 행을 추가한다.
CREATE TABLE certification_prerequisite (
    id                             BIGSERIAL PRIMARY KEY,
    prerequisite_certification_id  BIGINT NOT NULL REFERENCES certification (id) ON DELETE CASCADE,
    certification_id               BIGINT NOT NULL REFERENCES certification (id) ON DELETE CASCADE,
    UNIQUE (prerequisite_certification_id, certification_id)
);

# Temporary Idea Workflow

## Purpose

확정 반영 요청이 없는 아이디어를 일관된 형식으로 기록하고, 사용자가 원할
때 출처를 유지한 채 승인 큐 제안으로 전환한다.

## Status

- `active`: 검토하거나 발전시킬 수 있는 임시 아이디어
- `converted`: 승인 큐 제안으로 전환된 아이디어
- `archived`: 사용자가 더 진행하지 않기로 한 아이디어

상태는 아이디어의 확정 여부를 뜻하지 않는다. 모든 임시 아이디어는 승인 전
정보이며 `converted`도 확정 문서 반영을 의미하지 않는다.

## Item Format

```markdown
### IDEA-YYYYMMDD-NNN: 제목

- 프로젝트 ID:
- 상태: active | converted | archived
- 생성일:
- 수정일:
- 사용자 입력:
- 관련 확정 문서:
- 관련 승인 항목:

#### Idea

아이디어 내용.

#### Missing Information

- TBD:

#### Revision History

- 날짜 / 변경 요약:
```

## Add Steps

1. 확정 반영 요청이 없는지 확인하고 요청을 `temporary_idea`로 분류한다.
2. 대상 프로젝트를 결정하고 해당 프로젝트 ID를 기록한다.
3. `workspace/projects/<project_slug>/ideas/temporary_ideas.md`와 관련 확정 문서에서 중복 또는 충돌
   후보를 검색한다.
4. 같은 날짜의 마지막 번호 다음 값으로 고유 ID를 만든다.
5. 사용자 입력과 아이디어 내용을 분리하고 부족한 정보는 `TBD`로 둔다.
6. 상태를 `active`로 지정해 `workspace/projects/<project_slug>/ideas/temporary_ideas.md`에 추가한다.
7. `workspace/projects/<project_slug>/design/`, Approval Queue, Decision Log, Version History는
   수정하지 않는다.

## Update Steps

1. 사용자가 지정한 아이디어 ID나 제목을 확인한다. 후보가 여러 개면 묻는다.
2. 사용자 요청과 충돌하지 않는 기존 내용은 보존한다.
3. 수정일과 Revision History에 변경 날짜와 요약을 추가한다.
4. 아이디어를 더 진행하지 않기로 명시하면 `archived`로 변경한다.
5. 수정이나 보관에는 확정 문서 승인 절차를 적용하지 않지만, 확정 문서는
   수정하지 않는다.

## Convert To Approval Proposal

1. 사용자가 아이디어 ID나 제목을 지정해 문서화 또는 변경 제안 전환을
   명시했는지 확인한다.
2. `docs/workflows/document_change.md`에 따라 관련 확정 문서와 기존 승인
   항목을 다시 검색한다.
3. 검색 결과에 따라 신규 문서, 기존 문서 변경 또는 추가 질문으로 분기한다.
4. 승인 항목의 근거 파일에 해당 아이디어 ID와
   `workspace/projects/<project_slug>/ideas/temporary_ideas.md` 경로를 기록한다.
5. 승인 항목이 실제 Approval Queue에 추가되면 아이디어 상태를
   `converted`로 바꾸고 관련 승인 항목 ID를 연결한다.
6. 전환 후에도 원래 아이디어와 Revision History를 삭제하지 않는다.
7. 전환은 승인이 아니다. 사용자의 명시적 승인과 적용 절차 전에는
   `workspace/projects/<project_slug>/design/`을 수정하지 않는다.

## Output

- 등록 또는 수정된 임시 아이디어 항목
- 중복 및 관련 문서 후보
- 전환 시 생성된 승인 항목 링크
- 누락 정보와 필요한 질문

## Safety Rules

- 사용자 입력에 없는 설정을 확정 사실처럼 추가하지 않는다.
- 임시 아이디어와 확정 문서의 내용을 섞지 않는다.
- 승인 항목 전환만으로 아이디어를 삭제하거나 확정 처리하지 않는다.
- 다른 프로젝트의 임시 아이디어 파일에 추가하거나 프로젝트 간 아이디어를 자동 병합하지 않는다.

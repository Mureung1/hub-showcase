---
name: daily-publish
description: 챌린지 하루치 산출물을 올릴 때 쓴다("올려" 라고 하면). activity-curation의 N186_이재호 브랜치, hub 미러 PR, 위키, GitHub 이슈를 서로 안 어긋나게 한 번에 정리해서 올린다. main에는 절대 안 올린다.
---

# 데일리 퍼블리싱

챌린지는 매일 "미션 받고 -> 과제하고 -> 올린다"의 반복이다. 이 스킬은 그 "올린다"를 일관되게 한다.
네 군데(로컬 repo·hub 미러·위키·이슈)를 같은 최신 상태로 맞춰서, 예전 것과 새 것이 섞이지 않게 한다.

## 절대 규칙 (어기면 안 됨)
- **main 브랜치에 절대 push/PR 하지 않는다.** activity-curation도 hub도 오직 `N186_이재호`.
- hub PR의 base는 반드시 `N186_이재호`(main 아님). PR 만든 뒤 base를 실제로 확인한다.
- 올리기 전 반드시 물어본다. 사용자의 "올려" 신호 없이는 push/PR 하지 않는다.
- 커밋 저자는 jaeho9338-code, 메시지는 한국어로 담백하게(거창하게 X). 긴 대시 금지. AI 꼬리표(Co-Authored-By, Generated with) 안 붙인다.
- PR 제목: `[N186_이재호] - <담백한 요약> (N일차)`.

## 순서

1. **커밋 전 점검**
   - `git status`로 변경 확인. 커밋에 `.env`·API 키·개인정보가 섞였는지 grep으로 스캔(security-check 스킬 원칙). 섞였으면 멈추고 알린다.

2. **activity-curation `N186_이재호`에 커밋 + push**
   - 커밋을 작게 쪼갠다(한 커밋 한 가지). 브랜치가 N186_이재호인지 확인하고 push.

3. **hub 데일리 PR (미러)**
   - hub fork(`hub-자기소개`)에서 `git fetch upstream N186_이재호` 후 `dayN-...` 브랜치를 upstream/N186_이재호 기준으로 만든다.
   - hub의 `대외활동-큐레이션/` 폴더를 로컬과 100% 일치시킨다(예전 파일 잔재 제거):
     `rsync -a --delete --exclude node_modules --exclude .git --exclude .DS_Store "<로컬>/" "대외활동-큐레이션/"`
   - 커밋 후 fork 브랜치로 push, `gh pr create --base N186_이재호 --head jaeho9338-code:dayN-...`.
   - PR 본문에 그날 한 것 + 회고를 사용자 말투로(담백, 1인칭).

4. **위키 / 이슈 (바뀐 게 있으면)**
   - 위키 Home.md가 최신 기획과 어긋나면 반영해 push.
   - 이슈 내용이 최신 방향과 어긋나면 `gh issue edit`로 맞춘다.

5. **검증 (필수)**
   - activity-curation·hub의 `main`이 오늘 안 바뀌었는지 확인(`gh api .../commits/main` 날짜).
   - hub PR의 base가 `N186_이재호`인지 확인.
   - 키·개인정보가 안 올라갔는지 확인.

## 결과 보고
어디에 뭘 올렸는지(브랜치·PR 번호), main 안 건드림 확인, 남은 것(회고 등)을 표로 짧게 보고한다.

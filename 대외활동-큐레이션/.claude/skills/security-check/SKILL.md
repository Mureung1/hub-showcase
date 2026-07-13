---
name: security-check
description: 깃허브에 올리기(commit, push, PR) 전에 코드와 문서에 새어나가면 안 되는 것이 있는지 검사한다. API 키, 비밀번호, 토큰 같은 비밀값과 .env 파일, 개인정보(전화번호, 이메일, 실명)를 찾아 하나라도 있으면 올리기를 멈춘다. push나 PR을 만들기 전에 항상 사용.
---

# 올리기 전 보안 점검

깃허브는 공개다. 한 번 올라간 비밀값은 지워도 기록에 남는다. 그래서 올리기 전에 반드시 검사한다.

## 언제 돌리나

git commit, push, PR을 만들기 직전에 항상. 통과해야만 올린다.

## 무엇을 검사하나

올릴 대상(스테이징된 변경 `git diff --cached`, 또는 새로 추가하는 파일)에서 아래를 찾는다.

- 비밀키와 토큰: `ghp_`, `github_pat_`, `sk-`, `AKIA`, `-----BEGIN` (개인키), `xox` (슬랙), 그리고 `api_key`, `apikey`, `secret`, `password`, `token`, `authorization` 뒤에 실제 값이 붙은 것.
- `.env` 파일 자체가 커밋에 들어갔는지. `.env`는 절대 올리지 않는다. `.env.example`(값 없는 틀)만 올린다.
- 개인정보: 전화번호(`010-...`), 이메일 주소, 실명이 코드나 문서에 박혔는지. (공개 저장소엔 안 넣는다.)
- 하드코딩된 접속 정보: DB 주소에 비밀번호가 같이 박힌 것 등.

## 어떻게 돌리나

스테이징된 변경이나 올릴 파일에 대해 위 패턴을 grep 한다. 예:

```
git diff --cached | grep -nE "ghp_|github_pat_|sk-|AKIA|BEGIN [A-Z]* ?PRIVATE KEY|api[_-]?key|secret|password|token" 
git diff --cached --name-only | grep -E "(^|/)\.env$"
```

## 통과 기준과 조치

- 위 패턴이 하나도 안 걸리면 통과. 올린다.
- 하나라도 걸리면 **멈춘다.** 그리고:
  - 비밀값이면 코드에서 빼서 `.env`로 옮기고, 코드는 `process.env`로 읽게 고친다. `.gitignore`에 `.env`가 있는지 확인.
  - 이미 커밋에 들어갔으면 그 커밋을 고치고, 이미 올라갔으면 그 키는 유출된 것으로 보고 폐기·재발급한다.
  - 개인정보면 지우거나 가린다.
- 고친 뒤 다시 검사해서 깨끗하면 그때 올린다.

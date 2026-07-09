---
name: md-opener
description: >-
  사용자의 명시적 요청이 있을 때 마크다운 파일(계획서, 기획안, 산출물 등)을 실행(열기)하는 스킬.
always_on: false
---

# 마크다운 파일 오픈 스킬

이 스킬은 사용자가 생성되거나 수정된 마크다운(.md) 파일을 열어달라고 명시적으로 요청할 때 활성화됩니다.

## 작동 지침
1. 사용자가 방금 생성/수정된 마크다운 파일을 열어달라고 요청하는 경우(예: "방금 만든 파일 열어줘", "방금 수정한 md 실행해줘"), 해당 파일의 절대 경로를 매개변수로 하여 아래 스크립트를 `run_command` 도구로 실행(Propose)합니다.

## 실행할 명령어 형식
```powershell
powershell -File C:\Users\JBbank\workspace\hub\.agents\skills\md-opener\scripts\open-md.ps1 -FilePath "<마크다운 파일 절대 경로>"
```

# 코드 검증 Agent

Later 저장소는 `.codex/agents/code-validator.toml`에 읽기 전용 코드 검증 Agent를
정의합니다.

## 사용 예시

Codex에서 다음과 같이 요청합니다.

```text
code_validator Agent를 사용해 현재 브랜치를 N046_김예진 브랜치와 비교 검토해줘.
```

또는 검토 범위를 명시합니다.

```text
code_validator Agent를 사용해 최근 커밋의 API, migration, 테스트 누락을 검토해줘.
```

## 검토 결과 형식

Agent는 코드를 수정하지 않고 다음 순서로 결과를 반환합니다.

1. 심각도순 발견 사항
2. 각 문제의 영향과 재현 근거
3. 정확한 파일 위치
4. 실행한 테스트·타입 검사·빌드 결과
5. 발견 사항이 없을 때 남아 있는 위험

검증 Agent의 리뷰는 자동 테스트, 브랜치 보호 규칙, 사람의 최종 검토를 대체하지
않습니다.

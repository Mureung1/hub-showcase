# ShowUp 검증 Agent (Skill)

ShowUp 프로젝트의 모든 검증을 한 번에 실행하는 Hermes Agent Skill입니다.

## 검증 순서

1. **Lint**: `npm run lint --workspace showup`
2. **TypeCheck**: `npm run typecheck --workspace showup`
3. **Build**: `npm run build --workspace showup`
4. **단위 테스트**:
   - `npm run verify:risk --workspace showup` (위험도 계산 9개 케이스)
   - `npm run verify:phone --workspace showup` (전화번호 파싱·마스킹 케이스)
   - `npm run verify:search --workspace showup` (검색 키워드 분석 13개 케이스)
   - `npm run verify:seed --workspace showup` (시드 데이터 10명 고객 검증)
5. **Firestore Rules**:
   - `cd apps/showup && firebase emulators:exec --only firestore "npm run verify:security"` (18개 케이스)

## 결과 해석

- **lint**: warning 0, error 0 이어야 PASS
- **typecheck**: tsc -b 에러 없어야 PASS
- **build**: vite build "built in" 메시지 나와야 PASS
- **단위 테스트**: 각 스크립트 exit code 0이어야 PASS

## 검증 완료 보고 형식

```
검증 결과:
- lint: PASS (warning 0, error 0)
- typecheck: PASS
- build: PASS (1.xx s)
- risk test: PASS (N개)
- phone test: PASS (N개)
- search test: PASS (N개)
- seed test: PASS (N개)
- security rules test: PASS (18개)
```

## TDD 적용

`search.test.ts`는 TDD 순서(red → green)로 작성되었습니다:
1. **Red**: 테스트 케이스 13개 작성 후 실행 → 1개 실패 (하이픈 포함 전화번호 판별)
2. **Green**: `isNameSearch` 로직 수정 → 13개 전부 PASS

## Hermes Skill 등록

이 Skill은 Hermes Agent에 `showup-verify` 이름으로 등록되어 있습니다.
Hermes 환경에서는 `~/.hermes/skills/software-development/showup-verify/SKILL.md`를 사용했다. 다른 환경에서는 위 명령을 직접 실행한다.

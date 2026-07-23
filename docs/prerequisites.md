# 사전 준비물 (사용자 결정·자격증명)

agent가 구현만으로 해결할 수 없는, **사용자가 직접 준비해야 하는** 항목이다. Task 착수 전 여기서 필요한 자격증명이 준비됐는지 확인한다. 미준비면 해당 Task는 `BLOCKED`.

| 항목 | 필요한 Task | 상태 | 비고 |
|---|---|---|---|
| `UPSTAGE_API_KEY` | T02, T06, T10, T11 | 준비됨(예정) | [console.upstage.ai](https://console.upstage.ai)에서 발급. `.env.local`에 넣고 Vercel 환경변수에도 등록 |
| Notion Integration 토큰 | T01, T02, T05 | 준비됨 | Notion 개발자 설정에서 internal integration 생성 → 토큰 |
| Notion DB ID (마이크로스텝용) | T02, T03 | 준비됨 | 템플릿 복사 후 DB URL에서 추출. `Title`·`EstimatedMinutes`(숫자)·`Category`(Select)·`ScheduledDate`(Date) 속성 포함해서 만들 것 |
| Notion DB ID (AgentLog용) | T05 | 미준비 | agent-design.md 스키마대로 생성 후 ID |
| Solar 모델명 확정 | T02 | 확인 필요 | 현재 `solar-pro2`. 구조화 출력이 안 되면 `solar-pro3` 등으로 교체 |

## 환경변수 목록 (`.env.local`)

```
UPSTAGE_API_KEY=
NOTION_TOKEN=
NOTION_STEPS_DB_ID=
NOTION_AGENTLOG_DB_ID=
```

`.env*`는 `.gitignore`에 있어 커밋되지 않는다. Vercel 배포 시 같은 값을 Vercel 대시보드 환경변수에 등록해야 한다.

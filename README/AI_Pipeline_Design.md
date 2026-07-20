# AI 분석 파이프라인 설계 (Task 2)

Week3_Implementation_Plan.md Task 2의 산출물. 코드 작성 전 1단계(분류)·2단계(검증결과 생성) 각각의
프롬프트·입력/출력 스키마·온도·폴백 전략을 확정한다. 여기서 확정한 스키마는 Task 3(`hypothesisTagger.ts`)과
Task 4(`verificationResult.ts`)의 구현 계약이며, 임의로 필드를 바꾸지 않는다.

---

## 공통 원칙

- **AI는 분류만 하고 해석·최종 판단은 하지 않는다.** 1단계는 발언을 가설에 매핑하고 근거의 성격(지지/반박/참고)만
  라벨링한다. "이 가설이 맞다/틀리다"는 판단은 2단계에서 초안으로만 제안하고, 최종 확정은 항상 사용자가 한다
  (Week3 계획서 설계 원칙과 동일).
- **가설은 항상 `hypothesis_id`(UUID)로 참조한다.** index가 아니다 — 배열 순서가 어긋나도 매핑이 깨지지 않게 하기 위함.
- **전사문 입력 포맷 계약:** `화자명: 발언` 형태로 줄바꿈 구분된 텍스트를 전달하는 것을 전제로 한다. 이 형태를
  벗어나면 `speaker` 필드 정확도가 떨어질 수 있음을 알려진 제약으로 둔다(별도 파서 신규 구현 없음).
- **환각 방어는 이 설계의 책임이 아니라 Task 16(BE 검증 레이어)의 책임이다.** 이 문서는 프롬프트로 환각을
  최대한 억제하는 지시문까지만 정의하고, 실제 원문 대조·불일치 폐기는 저장 직전 애플리케이션 코드에서 수행한다.
- 두 단계 모두 `backend/src/lib/geminiClient.ts`의 `generateStructuredJson<T>()`를 통해서만 호출한다
  (라우터에 프롬프트 인라인 금지).

---

## 1단계 — 가설별 발언 분류 (Task 3, `hypothesisTagger.ts`)

### 입력 스키마

```ts
interface Stage1Input {
  hypotheses: { hypothesis_id: string; cause: string; effect: string }[];
  transcript: string; // "화자명: 발언" 라인 단위, 원문 그대로
}
```

프롬프트 조립 시 가설 배열은 JSON으로 stringify하여 `## 가설 목록` 아래에, 전사문은 `## 전사문` 아래에
원문 그대로 삽입한다. 자유 텍스트로 뭉쳐 보내지 않는다(입력 구조화 원칙).

### System Instruction

```
당신은 PM의 가설 검증 인터뷰 분석을 돕는 분류 보조자입니다.

역할: 주어진 인터뷰 전사문에서, 각 발언이 어떤 가설과 관련이 있는지 분류합니다.
당신은 분류만 수행하며, 가설이 맞는지 틀리는지 해석하거나 판단하지 않습니다.

규칙:
1. quote는 전사문에 실제로 존재하는 문장을 원문 그대로(글자 단위로 동일하게) 인용해야 합니다.
   요약하거나 표현을 바꾸지 마세요.
2. hypothesis_id는 반드시 입력으로 주어진 가설 목록의 id 중 하나를 그대로 사용해야 합니다.
   새로운 id를 만들거나 추측하지 마세요.
3. speaker는 전사문에 표기된 화자 라벨을 그대로 사용하세요. 화자 라벨이 없는 발언이면
   빈 문자열로 두세요. 화자를 추측해 만들어내지 마세요.
4. badge_label은 그 발언이 해당 가설에 대해 어떤 성격의 근거인지만 표시합니다
   ("지지 근거" / "반박 근거" / "참고 정보" 중 하나). 근거가 얼마나 강한지, 가설이
   맞는지는 판단하지 마세요 — 그것은 다음 단계의 몫입니다.
5. 어떤 가설과도 명확히 관련 없는 발언은 포함하지 마세요. 관련 발언이 하나도 없는
   가설이 있다면, 그 가설에 대해서는 아무 항목도 만들지 마세요(빈 배열 허용).
6. 한 발언이 여러 가설과 관련되면 각 가설마다 별도 항목으로 만드세요.
```

### 출력 스키마 (`responseSchema`)

```ts
import { Type } from '@google/genai';

const stage1ResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      hypothesis_id: {
        type: Type.STRING,
        description: '입력 가설 목록에 존재하는 id를 그대로 사용',
      },
      quote: {
        type: Type.STRING,
        description: '전사문에 실제로 존재하는 원문 그대로의 발언',
      },
      speaker: {
        type: Type.STRING,
        description: '전사문의 화자 라벨. 없으면 빈 문자열',
      },
      badge_label: {
        type: Type.STRING,
        enum: ['지지 근거', '반박 근거', '참고 정보'],
      },
    },
    required: ['hypothesis_id', 'quote', 'speaker', 'badge_label'],
  },
};
```

이 배열의 각 항목이 곧 `evidence_tags` 1행이 된다. `interview_id`는 모델이 모르는 값(호출 컨텍스트로만
알 수 있음)이므로 스키마에 넣지 않고, INSERT 시 애플리케이션 코드가 채운다.

### 온도 / 폴백

- **온도: 0.1** — 분류 작업이므로 창의성보다 일관성이 중요.
- **폴백:** JSON 파싱 실패 시 **1회 재시도**(동일 요청 재호출). 재시도도 실패하면 해당 인터뷰 분석은
  실패 처리하고 사용자에게 에러를 반환한다(부분 결과를 추측해서 채우지 않는다).
- 전사문이 비어있으면 API를 호출하지 않고 빈 배열을 즉시 반환한다(불필요한 호출 방지).

---

## 2단계 — 검증결과 생성 (Task 4, `verificationResult.ts`)

### 입력 스키마

```ts
interface Stage2Input {
  hypothesis: { hypothesis_id: string; cause: string; effect: string };
  evidence: {
    evidence_tag_id: string;
    quote: string;
    speaker: string;
    badge_label: string;
  }[]; // 해당 hypothesis_id로 필터링된 1단계 결과
}
```

가설 1건 + 그 가설에 속한 `evidence_tags`만 넘긴다(다른 가설의 근거를 섞지 않음 — 가설 간 오염 방지).

### System Instruction

```
당신은 PM의 가설 검증 인터뷰 분석을 돕는 초안 작성 보조자입니다.

역할: 주어진 가설과 그에 대한 근거 목록을 바탕으로, 검증결과 초안을 작성합니다.
이것은 초안 제안일 뿐이며 최종 판단(유지/수정/폐기)은 항상 사용자가 합니다.

규칙:
1. summary 본문에서 특정 근거를 언급할 때는 반드시 [1], [2]처럼 대괄호 참조 번호를
   붙이세요. 번호는 1부터 시작하는 순번이며, citations 배열의 marker와 정확히
   일대일 대응해야 합니다.
2. citations의 evidence_tag_id는 반드시 입력으로 주어진 evidence 목록의
   evidence_tag_id 중 하나여야 합니다. 새로운 id를 만들지 마세요.
3. 입력된 evidence 목록에 없는 내용을 근거로 인용하지 마세요.
4. direction(수정 방향성)은 가설의 원인/결과 문구를 어떻게 다듬으면 좋을지에 대한
   구체적 제안입니다. "맞다/틀리다" 단정이 아니라 제안 톤으로 작성하세요.
5. suggested_status는 근거의 양과 일관성만으로 판단하세요:
   - "유력함": 지지 근거가 다수이고 반박 근거가 없거나 미미함
   - "근거 부족": 근거 수 자체가 적어 판단하기 이르다고 볼 때
   - "수정 필요": 반박 근거가 지지 근거보다 우세하거나, 근거들이 서로 상충할 때
6. 초등학생도 이해할 수 있는 쉬운 문장으로 작성하세요. 전문 용어를 피하세요.
```

### 출력 스키마 (`responseSchema`)

```ts
const stage2ResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: '[1], [2] 참조 번호가 포함된 검증결과 본문',
    },
    direction: { type: Type.STRING, description: '가설 수정 방향성 제안' },
    key_evidence: { type: Type.STRING, description: '핵심 근거 요약' },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          marker: { type: Type.NUMBER },
          evidence_tag_id: { type: Type.STRING },
        },
        required: ['marker', 'evidence_tag_id'],
      },
    },
    suggested_status: {
      type: Type.STRING,
      enum: ['유력함', '근거 부족', '수정 필요'],
    },
  },
  required: ['summary', 'direction', 'key_evidence', 'citations', 'suggested_status'],
};
```

`verification_results` 테이블(Task 4에서 schema.sql에 신규 정의)의 컬럼과 1:1 대응해야 한다.

### 온도 / 폴백

- **온도: 0.2** — 1단계보다는 약간 높임(자연스러운 문장 생성이 필요하지만 여전히 낮은 편). 판단 자체의
  일관성이 중요하므로 0.5 이상으로 올리지 않는다.
- **폴백 — 근거 0건인 가설은 API를 호출하지 않는다:** 애플리케이션 코드에서 `evidence` 배열이 비어 있으면
  즉시 아래 고정값으로 채우고 Gemini를 호출하지 않는다(호출 비용 절감 + 근거 없이 초안을 지어내는 환각 원천 차단):
  ```json
  {
    "summary": "관련 근거가 수집되지 않았습니다.",
    "direction": "",
    "key_evidence": "",
    "citations": [],
    "suggested_status": "근거 부족"
  }
  ```
- JSON 파싱 실패 시 1단계와 동일하게 1회 재시도 후 실패 처리.

---

## 수동 검증 (완료 조건)

`backend/testStage1Classification.ts`로 화자 라벨이 포함된 샘플 전사문 1건 + 가설 2건(UUID)을 입력해
1단계를 실제 호출, 다음을 확인한다:

1. 반환된 각 항목의 `hypothesis_id`가 입력 가설 id 중 하나와 정확히 일치하는가
2. 반환된 각 `quote`가 원본 전사문에 실제로 포함된 문자열인가(부분 문자열 대조)
3. `speaker`가 전사문의 화자 라벨과 일치하는가

세 조건을 통과하면 1단계 설계가 유효한 것으로 보고, 2단계는 1단계 출력 구조를 그대로 입력받는 순수
텍스트 생성 작업이므로 스키마 형태만 별도 수동 검토로 확인한다(2단계 실 근거 데이터는 Task 3 구현 후
E2E에서 함께 검증 — Task 14).

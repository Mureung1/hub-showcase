// 이 파일은 서버가 요청을 받을 때 실행되는 코드가 아니라, 사람이 필요할 때 수동으로
// 한 번(또는 명령어 목록이 바뀔 때마다) 돌리는 "관리자용 authoring 도구"다 (`npm run generate:scenarios`).
// 목적: Claude API 구조화된 출력(output_config.format)으로 "상황별 명령어 묶음" 초안을 JSON으로
// 생성한다. 이 스크립트가 만든 결과는 src/data/scenarios.js를 바로 덮어쓰지 않고 별도 draft
// 파일로만 저장한다 — 사용자가 직접 읽고 다듬은 뒤 수동으로 scenarios.js를 확정해야 한다
// (AI 초안 + 사람 검토, docs/plan.md 설계 결정 참고).
import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { commands } from '../../../src/data/commands.js';

const DRAFT_PATH = new URL('../../../src/data/scenarios.js.draft', import.meta.url);

const SCENARIO_SCHEMA = {
    type: 'object',
    properties: {
        scenarios: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'kebab-case 고유 id, 예: submit-assignment' },
                    title: { type: 'string', description: '한국어 시나리오 제목, 예: 과제 제출하기' },
                    description: { type: 'string', description: '이 상황이 언제 필요한지 한두 문장 설명' },
                    command_ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '이 상황에서 실제로 사용하는 순서대로 나열한 명령어 id 목록',
                    },
                },
                required: ['id', 'title', 'description', 'command_ids'],
                additionalProperties: false,
            },
        },
    },
    required: ['scenarios'],
    additionalProperties: false,
};

async function main() {
    // ANTHROPIC_API_KEY가 없으면 여기서 바로 실패시키고 끝낸다(fail-fast) —
    // migrateCommandsToSupabase.js/indexCommands.js와 같은 관례.
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY가 설정되지 않았습니다. server/.env를 확인하세요.');
        process.exit(1);
    }

    const client = new Anthropic();

    // 명령어 전체 설명(description/options/examples)은 프롬프트에 넣지 않는다 —
    // 시나리오 판단에는 id/name/summary만으로 충분하고, 넣을수록 입력 토큰만 늘어난다.
    const commandSummaries = commands.map(({ id, name, summary }) => ({ id, name, summary }));

    const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { format: { type: 'json_schema', schema: SCENARIO_SCHEMA } },
        messages: [
            {
                role: 'user',
                content: `너는 CS 부트캠프 실습생을 위한 Unix/Git 명령어 사전 앱을 만들고 있어.
아래는 앱에 등록된 명령어 49개(id/name/summary)야.

${JSON.stringify(commandSummaries, null, 2)}

이 명령어들로 "상황별 명령어 묶음"을 5~10개 만들어줘. 각 묶음은 "이 상황이면 이 명령어들이 필요하다"는
실습 시나리오야(예: 과제 제출하기, 권한 오류 해결하기, 실수한 커밋 되돌리기, 새 프로젝트 시작하기).
일반적인 Linux 레퍼런스가 아니라 이 부트캠프 실습 상황에 좁게 맞춘 큐레이션이어야 해 — 이게 이 앱의
핵심 차별점이야. command_ids는 실제로 그 상황에서 쓰는 순서대로 나열해줘.`,
            },
        ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
        throw new Error('응답에서 텍스트 블록을 찾지 못했습니다.');
    }

    const { scenarios } = JSON.parse(textBlock.text);

    // src/data/commands.js와 같은 export 구조로 draft 파일 작성. 사람이 그대로 읽고
    // 다듬을 수 있도록 실제 JS 소스 형태로 저장한다(JSON이 아니라).
    const fileContent = `// Claude API 구조화된 출력으로 생성된 초안 — 검토 후 scenarios.js로 옮길 것.
// 자동 생성 시각: ${new Date().toISOString()}
export const scenarios = ${JSON.stringify(scenarios, null, 2)};
`;

    fs.writeFileSync(DRAFT_PATH, fileContent);
    console.log(`시나리오 초안 ${scenarios.length}개 생성 완료: ${DRAFT_PATH.pathname}`);
}

// main()이 정상적으로 끝난 경우엔 이 catch가 실행되지 않고 스크립트가 조용히 종료되고,
// 도중에 에러가 던져진 경우(API 키 문제, 스키마 위반 등)에만 여기로 들어와 로그를 남긴다.
main().catch((error) => {
    console.error('시나리오 생성 실패:', error);
    process.exit(1);
});

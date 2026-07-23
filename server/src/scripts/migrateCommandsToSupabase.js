// indexCommands.js(Meilisearch용)와 같은 성격의 관리자용 스크립트 — 서버가 요청을 받을 때
// 실행되는 코드가 아니라, 사람이 필요할 때 수동으로 한 번 돌리는 것(`npm run migrate:commands`).
// 목적: src/data/commands.js의 정적 데이터를 Supabase(categories/commands 테이블)로 옮긴다.
// 원본 파일(src/data/commands.js)은 삭제하지 않는다 — indexCommands.js가 여전히 이 파일을 참조한다.
import 'dotenv/config';
import { commands, CATEGORY_LABELS } from '../../../src/data/commands.js';
import { supabase } from '../config/supabase.js';

// CATEGORY_LABELS({ unix: '유닉스 명령어', git: 'Git 명령어' })를
// categories 테이블 행 형태([{ key, label }])로 바꾸는 순수 함수.
// 입출력만 있고 부수효과(DB 접근 등)가 없어서, 이 함수만 따로 유닛 테스트하기 좋다.
export function buildCategoryRows(categoryLabels) {
    return Object.entries(categoryLabels).map(([key, label]) => ({ key, label }));
}

// commands.js 배열 원소를 commands 테이블 행 형태로 바꾸는 순수 함수.
// 필드를 그대로 옮기는 것처럼 보이지만, 명시적으로 나열해서 "테이블 컬럼과 원본 필드가
// 정확히 몇 개, 무엇으로 매핑되는지"가 코드만 보고도 드러나게 했다(구조 분해 대신 스프레드를
// 쓰면 원본에 새 필드가 늘어도 여기 코드가 안 바뀌어서 매핑 누락을 알아채기 어려워짐).
export function buildCommandRows(commandList) {
    return commandList.map(({ id, category, name, summary, description, options, examples }) => ({
        id,
        category,
        name,
        summary,
        description,
        options,
        examples,
    }));
}

async function main() {
    // supabase가 null인 경우(.env에 SUPABASE_URL/SUPABASE_KEY 누락) 여기서 바로 실패시키고 끝내고,
    // null이 아닌 경우(정상 설정)에만 아래 단계로 이어진다. indexCommands.js와 같은 fail-fast 패턴.
    if (!supabase) {
        console.error('SUPABASE_URL/SUPABASE_KEY가 설정되지 않았습니다. server/.env를 확인하세요.');
        process.exit(1);
    }

    // 1단계: categories 먼저 업로드. commands.category가 categories.key를 참조(FK)하므로,
    // commands보다 반드시 먼저 들어가 있어야 한다. upsert를 써서 스크립트를 여러 번 돌려도
    // (데이터가 바뀌어 재실행하는 경우) 같은 key는 덮어쓰기만 되고 중복 에러가 나지 않는다.
    const categoryRows = buildCategoryRows(CATEGORY_LABELS);
    const { error: categoryError } = await supabase.from('categories').upsert(categoryRows);
    if (categoryError) {
        throw categoryError;
    }
    console.log(`categories 업로드 완료: ${categoryRows.length}개`);

    // 2단계: commands 업로드. options/examples는 JS 배열/객체 그대로 넘기면
    // supabase-js가 알아서 JSONB로 직렬화한다(별도 JSON.stringify 불필요).
    const commandRows = buildCommandRows(commands);
    const { error: commandError } = await supabase.from('commands').upsert(commandRows);
    if (commandError) {
        throw commandError;
    }
    console.log(`commands 업로드 완료: ${commandRows.length}개`);
}

// main()이 정상적으로 끝난 경우엔 이 catch가 실행되지 않고 스크립트가 조용히 종료되고,
// 도중에 에러가 던져진 경우(네트워크 문제, FK 위반, 컬럼 불일치 등)에만 여기로 들어와 로그를 남긴다.
main().catch((error) => {
    console.error('마이그레이션 실패:', error);
    process.exit(1);
});

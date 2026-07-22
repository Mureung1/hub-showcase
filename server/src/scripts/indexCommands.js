// 이 파일은 서버가 요청을 받을 때 실행되는 코드가 아니라, 사람이 필요할 때 수동으로
// 한 번 돌리는 "관리자용 스크립트"다 (`npm run index:commands`로 직접 실행).
// 목적: FE/BE가 이미 갖고 있는 정적 데이터(src/data/commands.js)를 Meilisearch 쪽으로
// 최초 한 번(또는 데이터가 바뀔 때마다) 복사해 넣는 것 — 검색은 이 인덱스를 대상으로 이뤄지고,
// commands.js 원본을 직접 검색하는 게 아니다.
import 'dotenv/config';
import { commands } from '../../../src/data/commands.js';
import { meiliAdminClient } from '../config/meilisearch.js'

async function main() {
    // meiliAdminClient가 null인 경우(.env 설정 누락) 여기서 바로 실패시키고 끝내고,
    // null이 아닌 경우(정상 설정)에만 아래 1~4단계로 이어진다.
    // 설정 없이 실행돼서 알 수 없는 에러로 헤매는 것보다, 원인을 바로 알려주는 게 낫다(fail-fast).
    if (!meiliAdminClient) {
        console.error('MEILISEARCH_HOST/MEILISEARCH_ADMIN_KEY가 설정되지 않았습니다. server/.env를 확인하세요.');
        process.exit(1);
    }

    // 1단계: commands.js의 49개 명령어 각각에서 4개 필드만 뽑아 Meilisearch 문서로 변환.
    // description/options/examples는 의도적으로 제외 — 검색 대상도 아니고(name/summary만 검색),
    // 결과 카드(CommandCard)에도 안 보이는 필드라 인덱스에 넣을 이유가 없다(docs/plan.md §6 필드 스펙).
    // 상세 정보는 사용자가 상세페이지로 들어갈 때 별도로(나중엔 Supabase에서) 가져온다.
    const documents = commands.map(({ id, category, name, summary }) => ({
        id,
        category,
        name,
        summary,
    }));

    // 2단계: "commands"라는 이름의 인덱스를 가리키는 핸들을 얻음. 이 시점엔 아직 아무 설정도 안 된 상태.
    const index = meiliAdminClient.index('commands');

    // 3단계: 이 인덱스에서 무엇을 검색 가능/필터 가능하게 할지 설정.
    // searchableAttributes에 name을 summary보다 먼저 나열한 이유: Meilisearch는 배열 순서를
    // 랭킹 우선순위로 쓰기 때문에, 이름이 일치하는 문서가 요약만 일치하는 문서보다 상위에 뜬다 —
    // src/utils/commandSort.js가 이미 쓰던 것과 같은 우선순위(이름 일치 > 요약 일치)를 그대로 재현.
    await index.updateSearchableAttributes(['name', 'summary']);
    // filterableAttributes에 category를 넣어야 search.js의 `filter: 'category = "unix"'`가 동작함
    await index.updateFilterableAttributes(['category']);

    // 4단계: 실제 문서 업로드. Meilisearch는 이걸 비동기 작업(task)으로 처리하므로,
    // addDocuments가 끝났다고 바로 검색 가능한 게 아니라 taskUid로 진행 상황을 추적할 수 있다는 것만 확인.
    const task = await index.addDocuments(documents);
    console.log(`업로드 요청 완료 (taskUid: ${task.taskUid}), 문서 ${documents.length}개`);
}

// main()이 정상적으로 끝난 경우엔 이 catch가 실행되지 않고 스크립트가 조용히 종료되고,
// 도중에 에러가 던져진 경우(네트워크 문제, 잘못된 인덱스 이름 등)에만 여기로 들어와 로그를 남긴다.
main().catch((error) => {
    console.error('인덱싱 실패:', error);
    process.exit(1);
})
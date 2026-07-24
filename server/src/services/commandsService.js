// DB 작업만 담당 — 요청 검증이나 응답 포맷은 controller 쪽 몫(관심사 분리).
import { supabase } from '../config/supabase.js';

// commands 테이블 전체 조회. 지금은 CategoryHomePage가 카테고리별 개수를 세는 데만 쓰지만,
// 49행 규모라 필터 없이 전체를 내려주고 개수 계산은 FE에서 하는 쪽이 API를 하나로 유지할 수 있어 더 단순하다.
export async function listCommands() {
    const { data, error } = await supabase.from('commands').select('*');
    if (error) {
        throw error;
    }
    return data;
}

// id로 명령어 하나 조회. Supabase는 .single()로 정확히 1행을 기대하는 조회를 하는데,
// 일치하는 행이 0개면 에러(code: 'PGRST116' = "행이 없음")를 던진다 — 이건 서버 장애가 아니라
// "그런 id가 없다"는 정상적인 케이스라서, 여기서 구분해 null로 바꿔 돌려준다.
// controller가 null을 받으면 404로, 그 외 에러는 진짜 장애로 보고 그대로 던진다.
export async function getCommandById(id) {
    const { data, error } = await supabase.from('commands').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data;
}

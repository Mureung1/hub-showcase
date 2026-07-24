// DB 작업만 담당 — 요청 검증이나 응답 포맷은 controller 쪽 몫(관심사 분리). commandsService.js와 동일 패턴.
import { supabase } from '../config/supabase.js';

// scenarios 테이블 전체 조회. 10여 개 규모라 commands.js와 같은 이유로 필터 없이 전체를
// 내려주고, 명령어→시나리오 역방향 조회(CommandDetailPage "관련 상황")도 FE에서 필터링한다.
export async function listScenarios() {
    const { data, error } = await supabase.from('scenarios').select('*');
    if (error) {
        throw error;
    }
    return data;
}

// id로 시나리오 하나 조회. commandsService.getCommandById와 동일한 not-found 관례:
// 일치하는 행이 0개면 PGRST116 에러를 null로 바꿔 돌려주고, controller가 404로 응답한다.
export async function getScenarioById(id) {
    const { data, error } = await supabase.from('scenarios').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data;
}

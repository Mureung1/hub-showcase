import { listCommands, getCommandById } from '../services/commandsService.js';

// GET /api/commands — 전체 목록. searchService(FE)의 { results: [...] } 응답 포맷과 통일해서
// FE 쪽 파싱 코드가 두 API 사이에서 갈라지지 않게 한다.
export async function getCommands(req, res, next) {
    try {
        const commands = await listCommands();
        res.json({ results: commands });
    } catch (error) {
        next(error);
    }
}

// GET /api/commands/:id — 단일 조회. 존재하지 않는 id면 서비스가 null을 돌려주므로 여기서 404로,
// 그 외 에러(DB 연결 문제 등)는 index.js의 공통 에러 핸들러로 넘겨 { error: { message } } 포맷으로 통일한다.
export async function getCommand(req, res, next) {
    const { id } = req.params;

    try {
        const command = await getCommandById(id);

        if (!command) {
            return res.status(404).json({ error: { message: '존재하지 않는 명령어입니다.' } });
        }

        res.json(command);
    } catch (error) {
        next(error);
    }
}

import { listScenarios, getScenarioById } from '../services/scenariosService.js';

// GET /api/scenarios — 전체 목록. commandsController.getCommands와 동일하게
// { results: [...] } 포맷으로 통일해서 FE 파싱 코드가 API마다 갈라지지 않게 한다.
export async function getScenarios(req, res, next) {
    try {
        const scenarios = await listScenarios();
        res.json({ results: scenarios });
    } catch (error) {
        next(error);
    }
}

// GET /api/scenarios/:id — 단일 조회. 존재하지 않는 id면 서비스가 null을 돌려주므로 여기서 404로,
// 그 외 에러는 index.js의 공통 에러 핸들러로 넘겨 { error: { message } } 포맷으로 통일한다.
export async function getScenario(req, res, next) {
    const { id } = req.params;

    try {
        const scenario = await getScenarioById(id);

        if (!scenario) {
            return res.status(404).json({ error: { message: '존재하지 않는 시나리오입니다.' } });
        }

        res.json(scenario);
    } catch (error) {
        next(error);
    }
}

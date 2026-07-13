// 서버 상태 확인 응답
export function getHealth(req, res) {
    res.status(200).json({ status: 'ok' });
}

import { getSameGenderDatingCandidates } from '../services/datingMatchingService.js'

// 과팅 동성 그룹 매칭 후보 조회: 로그인한 유저와 같은 성별 + 취미 주/보조유형이 겹치는 후보 리스트를 반환한다
export async function matchDatingSame(req, res) {
  try {
    const userId = req.user.userId

    const candidates = await getSameGenderDatingCandidates(userId)

    return res.status(200).json({ candidates })
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '과팅 동성 매칭 처리 중 오류가 발생했습니다.' })
  }
}

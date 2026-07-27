import {
  getMyDatingTeamStatus,
  confirmDatingTeam,
  confirmSoloDatingTeam,
} from '../services/datingTeamService.js'
import { calculateAndSaveOppositeTeamMatches } from '../services/datingOppositeMatchingService.js'

// 로그인한 유저의 현재 과팅 팀 구성 현황(정원 + 합류한 팀원 목록) 조회
export async function getMyTeam(req, res) {
  try {
    const { userId } = req.user

    const status = await getMyDatingTeamStatus(userId)

    return res.status(200).json(status)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '팀 현황 조회 중 오류가 발생했습니다.' })
  }
}

// 팀 리더가 "팀 확정" 버튼을 눌렀을 때 호출되는 API. 팀 상태를 recruiting -> matched로 변경한다
export async function confirmTeam(req, res) {
  try {
    const { userId } = req.user
    const { teamId } = req.params

    const result = await confirmDatingTeam(teamId, userId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '팀 확정 중 오류가 발생했습니다.' })
  }
}

// 내 팀의 이성 그룹 매칭 후보 리스트를 계산해서 matches 테이블에 저장하고, 궁합 점수 높은 순으로 반환한다
export async function getOppositeMatches(req, res) {
  try {
    const { teamId } = req.params

    const result = await calculateAndSaveOppositeTeamMatches(teamId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '이성 그룹 매칭 처리 중 오류가 발생했습니다.' })
  }
}

// teamSize=1 유저가 "팀 확정" 버튼을 눌렀을 때 호출되는 API. 단독 팀 생성 + 확정을 한 번에 처리한다
export async function confirmSoloTeam(req, res) {
  try {
    const { userId } = req.user

    const result = await confirmSoloDatingTeam(userId)

    return res.status(200).json(result)
  } catch (err) {
    console.error(err)
    const status = err.status || 500
    return res
      .status(status)
      .json({ message: err.status ? err.message : '팀 확정 중 오류가 발생했습니다.' })
  }
}

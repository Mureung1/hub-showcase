import { prisma } from '../config/prismaClient.js'
import { calculateHobbyScore } from '../utils/calculateHobbyScore.js'

// 취미 발견 테스트는 8문항 고정 (프론트 hobbyQuestions.js와 동일하게 1~8번)
const REQUIRED_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

// 취미 발견 테스트 결과 저장: 답변을 채점해 hobby_test_results 테이블에 upsert
export async function submitHobbyTest(req, res) {
  try {
    const { answers } = req.body
    const userId = req.user.userId

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: '답변을 입력해주세요.' })
    }

    // 8문항 중 답변하지 않은 문항이 있는지 확인
    const missingQuestionIds = REQUIRED_QUESTION_IDS.filter(
      (questionId) => !answers[questionId],
    )
    if (missingQuestionIds.length > 0) {
      return res.status(400).json({
        message: `답변하지 않은 문항이 있습니다: ${missingQuestionIds.join(', ')}번`,
        missingQuestionIds,
      })
    }

    // 순수 함수로 타입별 점수와 주/보조 유형 계산
    const { scoreSummary, hobbyTags } = calculateHobbyScore(answers)

    // user_id가 unique 컬럼이므로, 이미 결과가 있으면 덮어쓰고 없으면 새로 생성
    const result = await prisma.hobbyTestResult.upsert({
      where: { userId: BigInt(userId) },
      update: {
        rawAnswers: answers,
        hobbyTags,
        scoreSummary,
      },
      create: {
        userId: BigInt(userId),
        rawAnswers: answers,
        hobbyTags,
        scoreSummary,
      },
    })

    return res.status(200).json({
      resultId: result.resultId.toString(),
      hobbyTags: result.hobbyTags,
      scoreSummary: result.scoreSummary,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '취미 테스트 결과 저장 중 오류가 발생했습니다.' })
  }
}

import { prisma } from '../config/prismaClient.js'
import { calculateDatingScore } from '../utils/calculateDatingScore.js'

// 이상형 테스트는 7문항 고정 (프론트 datingQuestions.js와 동일하게 1~7번)
const REQUIRED_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7]

// 이상형 테스트 결과 저장: 답변을 채점해 personality_tests 테이블(test_type='dating')에 upsert
export async function submitDatingTest(req, res) {
  try {
    const { answers } = req.body
    const userId = req.user.userId

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: '답변을 입력해주세요.' })
    }

    // 7문항 중 답변하지 않은 문항이 있는지 확인
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
    const { scores, primary, secondary } = calculateDatingScore(answers)
    const scoreSummary = { scores, primary, secondary }

    // personality_tests는 user_id+test_type 조합에 유니크 제약이 없어 findFirst 후 update/create로 upsert를 직접 구현
    const existing = await prisma.personalityTest.findFirst({
      where: { userId: BigInt(userId), testType: 'dating' },
    })

    const result = existing
      ? await prisma.personalityTest.update({
          where: { testId: existing.testId },
          data: { answers, scoreSummary },
        })
      : await prisma.personalityTest.create({
          data: { userId: BigInt(userId), testType: 'dating', answers, scoreSummary },
        })

    return res.status(200).json({
      testId: result.testId.toString(),
      scoreSummary: result.scoreSummary,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '이상형 테스트 결과 저장 중 오류가 발생했습니다.' })
  }
}

// PATCH /api/matches/:id 요청 바디 검증.
import { z } from 'zod'

// 클라이언트가 직접 설정 가능한 상태만 허용한다.
// recommended/expired/replied는 서버 내부 로직에서만 전이한다(replied는 POST /:matchId/reply 전용).
// feedback_reason/feedback_text는 스쳐 가기(dismissed) 시 선택 사항으로 함께 보낼 수 있다.
export const matchStatusUpdateSchema = z.object({
  status: z.enum(['opened', 'dismissed'], { message: '허용되지 않은 상태예요.' }),
  feedback_reason: z.string().trim().min(1).max(80).optional(),
  feedback_text: z.string().trim().min(1).max(500).optional(),
})

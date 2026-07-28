// PATCH /api/matches/:id 요청 바디 검증.
import { z } from 'zod'

// 클라이언트가 직접 설정 가능한 상태만 허용한다.
// recommended/expired/replied는 서버 내부 로직에서만 전이한다(replied는 POST /:matchId/reply 전용).
export const matchStatusUpdateSchema = z.object({
  status: z.enum(['opened', 'dismissed'], { message: '허용되지 않은 상태예요.' }),
})

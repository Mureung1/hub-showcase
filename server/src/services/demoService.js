import { httpError } from '../lib/httpError.js'
import * as demoPoolRepo from '../repositories/demoPoolRepository.js'

/*
 * 시연용 소비자 계정 발급 (로그인 미구현 단계의 임시 장치).
 * 로그인(C1) 도입 시 이 서비스와 라우트는 제거하고 실제 인증으로 대체한다.
 */
export async function claimConsumer() {
  const claimed = await demoPoolRepo.claimNext()
  if (!claimed) throw httpError(503, '시연용 계정 풀이 비어 있습니다. 시딩을 확인해주세요.')
  return { ...claimed, role: 'consumer' }
}

export async function poolStatus() {
  return demoPoolRepo.countPool()
}

import { useMutation } from '@tanstack/react-query'
import { submitProfile } from '../api/client'

/** 온보딩 완료 시 프로필 제출용 mutation. `CompleteScreen`에서 호출한다 */
export function useSubmitProfile() {
  return useMutation({
    mutationFn: submitProfile,
  })
}

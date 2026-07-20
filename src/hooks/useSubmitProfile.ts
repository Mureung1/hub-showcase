import { useMutation } from '@tanstack/react-query'
import { submitProfile } from '../api/client'

/** 온보딩 완료 시 프로필 제출용 mutation 골격 (아직 화면에는 연결되지 않음) */
export function useSubmitProfile() {
  return useMutation({
    mutationFn: submitProfile,
  })
}

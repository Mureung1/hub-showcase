import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// persist 미들웨어가 token, user를 localStorage['auth-storage']에 자동으로 저장/복원해준다.
// 새로고침하거나 새 탭을 열어도 로그인 상태가 유지되고, logout()을 호출하면
// 상태가 null로 바뀌면서 저장된 값도 함께 비워진다.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

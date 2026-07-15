import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, set } from '../lib/storage.js'
import { getMeals, removeMealRecord, sumMealRecordsNutrients } from '../lib/mealStore.js'
import { upsertMeal as upsertDailyMeal } from '../lib/dailyRecord.js'
import { calcAssumedRecommendedNutrients } from '../lib/nutrition.js'
import { toDateKey } from '../lib/records.js'
import { supabase } from '../lib/supabase.js'

export const UserContext = createContext(null)

// 로그인 자체(신원 확인)는 Supabase Auth가 담당한다. 여기 저장하는 건 그 계정(uid)에 딸린
// 앱 전용 데이터(신체정보/권장섭취량/임시성별)뿐이다 — 데이터 저장은 이번 작업 범위 밖이라
// 기존과 동일하게 localStorage에 uid로 키를 매칭해 둔다(추후 Supabase 테이블로 옮길 때 이 한
// 파일만 갈아끼우면 되도록).
const LOCAL_PROFILES_KEY = 'users'

export function UserProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [localProfiles, setLocalProfiles] = useState(() => get(LOCAL_PROFILES_KEY, []))
  const [todayMeal, setTodayMeal] = useState(null) // MealAnalysis, /analyze -> /result 전달용(메모리만)
  const [todayMeals, setTodayMeals] = useState([]) // 오늘 먹은 끼니 목록(meal record[], mealStore, localStorage 영속)

  // 최초 진입 시 이미 있는 세션(새로고침 등)을 복원하고, 이후 로그인/로그아웃/토큰 갱신/OAuth
  // 리다이렉트 복귀를 모두 이 한 리스너로 받는다. 라우터 가드는 authLoading이 끝날 때까지 판단을
  // 미뤄서, 세션 복원 전에 잠깐 "비로그인"으로 보여 /login으로 튕기는 걸 막는다.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    set(LOCAL_PROFILES_KEY, localProfiles)
  }, [localProfiles])

  const currentUserId = session?.user?.id ?? null

  // 로그인 유저가 바뀌면 오늘 식단 목록을 localStorage에서 다시 불러온다.
  useEffect(() => {
    setTodayMeals(currentUserId ? getMeals(currentUserId, toDateKey(new Date())) : [])
  }, [currentUserId])

  const localData = useMemo(
    () => localProfiles.find((u) => u.id === currentUserId) || null,
    [localProfiles, currentUserId],
  )

  // 로그인 안 된 상태는 user가 null이어야 라우터 가드가 /login으로 보낼 수 있다(게스트 자동
  // 발급 없음). 로그인은 됐지만 아직 신체정보를 저장한 적 없는 계정은 profile/recommended/
  // tempSex가 전부 null인 상태로 내려간다.
  const user = useMemo(() => {
    if (!currentUserId || !session) return null
    return {
      id: currentUserId,
      email: session.user.email,
      profile: localData?.profile ?? null,
      recommended: localData?.recommended ?? null,
      tempSex: localData?.tempSex ?? null,
    }
  }, [currentUserId, session, localData])

  // 실제 프로필 기반 recommended가 있으면 그걸 우선하고, 없고 성별만 임시로 고른 상태(tempSex)면
  // 표준 성인 가정값(calcAssumedRecommendedNutrients)으로 계산한 임시 기준을 쓴다. 프로필을 저장하면
  // recommended가 채워지며 이 임시값을 자동으로 대체한다(Profile.jsx가 저장 시 tempSex도 함께 지운다).
  const effectiveRecommended = useMemo(() => {
    if (user?.recommended) return user.recommended
    if (user?.tempSex) return calcAssumedRecommendedNutrients(user.tempSex)
    return null
  }, [user])
  const isTempRecommended = Boolean(!user?.recommended && user?.tempSex)

  // data.session이 없으면(프로젝트 설정에 이메일 확인이 켜져 있으면) 곧바로 로그인되지 않았다는
  // 뜻이라, 호출부(Login.jsx)가 "이메일을 확인해주세요" 안내를 보여줄 수 있게 그 사실을 반환한다.
  const signup = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    return { needsEmailConfirmation: !data.session }
  }, [])

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  // 구글 로그인은 페이지 전체가 구글로 리다이렉트됐다가 돌아오는 방식이라, 성공 후 다음 화면
  // 이동은 (돌아온 뒤 세션이 잡히는 걸 지켜보는) Login.jsx의 useEffect가 이메일 로그인과 동일하게
  // 처리한다 — 콜백 전용 라우트를 따로 두지 않고 원래 있던 /login으로 되돌아오게 한다.
  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) throw new Error(error.message)
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updateUser = useCallback(
    (patch) => {
      if (!currentUserId) return
      setLocalProfiles((prev) => {
        if (!prev.some((u) => u.id === currentUserId)) {
          return [...prev, { id: currentUserId, profile: null, recommended: null, tempSex: null, ...patch }]
        }
        return prev.map((u) => (u.id === currentUserId ? { ...u, ...patch } : u))
      })
    },
    [currentUserId],
  )

  // items: 한 번의 분석에서 나온 음식 전체(1개면 단일 메뉴, 2개 이상이면 한 끼 세트) — 하나의 끼니 기록으로 저장한다.
  // recommended: 저장 시점의 권장 섭취량(그날 DailyRecord 스냅샷용, 없으면 null로 넘겨도 됨).
  // 실제 추가는 dailyRecord.upsertMeal에 위임한다(mealStore 추가 + recommended 스냅샷을 한 번에 처리) —
  // 여기서 mealStore를 따로 또 건드리면 같은 끼니가 두 번 추가되므로 반드시 이 한 곳만 거쳐야 한다.
  const addTodayMeal = useCallback(
    (items, mealType, recommended) => {
      if (!currentUserId) return null
      const dateKey = toDateKey(new Date())
      const record = upsertDailyMeal(currentUserId, dateKey, { items, mealType }, recommended)
      if (!record) return null
      setTodayMeals(record.meals)
      return record.meals[record.meals.length - 1] ?? null
    },
    [currentUserId],
  )

  // mealRecordId: 끼니 단위 삭제(그 끼니를 구성하는 음식 전체가 함께 제거된다).
  const removeTodayMeal = useCallback(
    (mealRecordId) => {
      if (!currentUserId) return
      const dateKey = toDateKey(new Date())
      removeMealRecord(currentUserId, dateKey, mealRecordId)
      setTodayMeals(getMeals(currentUserId, dateKey))
    },
    [currentUserId],
  )

  const todayMealsTotal = useMemo(() => sumMealRecordsNutrients(todayMeals), [todayMeals])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      effectiveRecommended,
      isTempRecommended,
      signup,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      todayMeal,
      setTodayMeal,
      todayMeals,
      todayMealsTotal,
      addTodayMeal,
      removeTodayMeal,
    }),
    [
      user,
      authLoading,
      effectiveRecommended,
      isTempRecommended,
      signup,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      todayMeal,
      todayMeals,
      todayMealsTotal,
      addTodayMeal,
      removeTodayMeal,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}

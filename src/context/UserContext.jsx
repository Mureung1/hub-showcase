import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, set } from '../lib/storage.js'
import * as dataStore from '../lib/dataStore.js'
import { sumMealRecordsNutrients, sumNutrients } from '../lib/mealStore.js'
import { calcAssumedRecommendedNutrients } from '../lib/nutrition.js'
import { toDateKey } from '../lib/records.js'
import { supabase } from '../lib/supabase.js'

export const UserContext = createContext(null)

// tempSex는 신체정보를 아직 저장하지 않은 상태가 딱 성별만 골라 임시 권장량을 미리 보는 수단이라,
// "진짜 데이터"가 아니다 — 그래서 profiles 테이블/게스트 프로필로 옮기지 않고 기기(브라우저)
// 로컬에만 effectiveUserId별로 가볍게 남긴다.
const TEMP_SEX_KEY = 'tempSex'

export function UserProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [recommended, setRecommended] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [tempSexByUser, setTempSexByUser] = useState(() => get(TEMP_SEX_KEY, {}))
  const [todayMeal, setTodayMeal] = useState(null) // MealAnalysis, /analyze -> /result 전달용(메모리만)
  const [todayMeals, setTodayMeals] = useState([]) // 오늘 먹은 끼니 목록(meal record[], dataStore 조회)
  const [todayMealsLoading, setTodayMealsLoading] = useState(true)
  const [todayMealsError, setTodayMealsError] = useState('')

  // 최초 진입 시 이미 있는 세션(새로고침 등)을 복원하고, 이후 로그인/로그아웃/토큰 갱신/OAuth
  // 리다이렉트 복귀를 모두 이 한 리스너로 받는다. 로그인은 이제 선택 사항이라(게스트도 앱을 그대로
  // 쓸 수 있음) authLoading은 라우터가 /login으로 튕기는 데 쓰이지 않고, 세션 복원 전에 잠깐
  // "게스트"로 오판해 화면이 깜빡이는 것만 막는 용도로 쓰인다.
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
    set(TEMP_SEX_KEY, tempSexByUser)
  }, [tempSexByUser])

  const currentUserId = session?.user?.id ?? null
  // 로그인 여부와 무관하게 항상 존재하는 식별자 — 로그인 계정이면 Supabase uid, 게스트면
  // dataStore.GUEST_ID(브라우저 하나당 하나뿐인 로컬 버킷). CSV 내보내기, 달력의 수동 상태 저장처럼
  // "누구 것인지" 키가 필요한 로컬 전용 기능들이 이 값을 그대로 가져다 쓴다.
  const effectiveUserId = currentUserId ?? dataStore.GUEST_ID
  const authMode = currentUserId ? 'user' : 'guest'

  // 게스트<->로그인 전환(currentUserId가 바뀔 때)마다 신체정보를 다시 불러온다. dataStore가 내부에서
  // 게스트(localStorage)/로그인(Supabase) 중 어디서 읽을지 알아서 판단하므로 여기서는 분기하지 않는다.
  useEffect(() => {
    let cancelled = false
    setProfileLoading(true)
    setProfileError('')

    dataStore
      .getProfile()
      .then((result) => {
        if (cancelled) return
        setProfile(result?.profile ?? null)
        setRecommended(result?.recommended ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setProfileError(err.message || '신체정보를 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // 게스트<->로그인 전환 시 오늘 식단 목록도 다시 불러온다.
  useEffect(() => {
    let cancelled = false
    setTodayMealsLoading(true)
    setTodayMealsError('')

    dataStore
      .getMeals(toDateKey(new Date()))
      .then((meals) => {
        if (!cancelled) setTodayMeals(meals)
      })
      .catch((err) => {
        if (!cancelled) setTodayMealsError(err.message || '식단 기록을 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setTodayMealsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const refetchTodayMeals = useCallback(async () => {
    setTodayMealsLoading(true)
    setTodayMealsError('')
    try {
      setTodayMeals(await dataStore.getMeals(toDateKey(new Date())))
    } catch (err) {
      setTodayMealsError(err.message || '식단 기록을 불러오지 못했어요.')
    } finally {
      setTodayMealsLoading(false)
    }
  }, [])

  const tempSex = tempSexByUser[effectiveUserId] ?? null

  const setTempSex = useCallback(
    (sex) => {
      setTempSexByUser((prev) => ({ ...prev, [effectiveUserId]: sex }))
    },
    [effectiveUserId],
  )

  const clearTempSex = useCallback(() => {
    setTempSexByUser((prev) => {
      if (!(effectiveUserId in prev)) return prev
      const next = { ...prev }
      delete next[effectiveUserId]
      return next
    })
  }, [effectiveUserId])

  // authUser: Supabase 로그인 계정 정보(헤더의 이메일 표시·로그인/로그아웃 버튼 분기 전용). 게스트는
  // null. 신체정보(profile)/권장량(recommended)은 로그인 여부와 무관하게 항상 위 상태를 그대로
  // 쓴다(게스트도 값이 있을 수 있음) — authUser에 종속시키지 않는다.
  const authUser = useMemo(() => {
    if (!currentUserId || !session) return null
    return { id: currentUserId, email: session.user.email }
  }, [currentUserId, session])

  // 실제 프로필 기반 recommended가 있으면 그걸 우선하고, 없고 성별만 임시로 고른 상태(tempSex)면
  // 표준 성인 가정값(calcAssumedRecommendedNutrients)으로 계산한 임시 기준을 쓴다. 프로필을 저장하면
  // recommended가 채워지며 이 임시값을 자동으로 대체한다(saveProfile이 저장 시 tempSex도 함께 지운다).
  const effectiveRecommended = useMemo(() => {
    if (recommended) return recommended
    if (tempSex) return calcAssumedRecommendedNutrients(tempSex)
    return null
  }, [recommended, tempSex])
  const isTempRecommended = Boolean(!recommended && tempSex)

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

  // 최초 로딩(useEffect)이 네트워크 오류 등으로 실패했을 때 LoadGate의 재시도 버튼이 부르는 함수.
  const refetchProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError('')
    try {
      const result = await dataStore.getProfile()
      setProfile(result?.profile ?? null)
      setRecommended(result?.recommended ?? null)
    } catch (err) {
      setProfileError(err.message || '신체정보를 불러오지 못했어요.')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Profile.jsx가 저장 버튼을 누를 때 호출. 실패하면 그대로 던져서 호출부가 "저장 중" 스피너를
  // 끄고 재시도 안내를 보여줄 수 있게 한다(여기서 삼키지 않는다).
  const saveProfile = useCallback(
    async ({ profile: newProfile, recommended: newRecommended }) => {
      const result = await dataStore.saveProfile({ profile: newProfile, recommended: newRecommended })
      setProfile(result?.profile ?? newProfile)
      setRecommended(result?.recommended ?? newRecommended)
      clearTempSex()
    },
    [clearTempSex],
  )

  // items: 한 번의 분석에서 나온 음식 전체(1개면 단일 메뉴, 2개 이상이면 한 끼 세트) — 하나의 끼니 기록으로
  // 저장한다(게스트는 localStorage, 로그인 계정은 Supabase meals 테이블). 실패하면 그대로 던져서
  // 호출부(Analyze.jsx)가 "저장 중" 표시를 끄고 재시도 안내를 보여줄 수 있게 한다.
  const addTodayMeal = useCallback(async (items, mealType) => {
    const dateKey = toDateKey(new Date())
    const total = sumNutrients(items)
    const record = await dataStore.addMeal(dateKey, mealType, items, total)
    if (!record) return null
    setTodayMeals((prev) => [...prev, record])
    return record
  }, [])

  // mealRecordId: 끼니 단위 삭제(그 끼니를 구성하는 음식 전체가 함께 제거된다). 실패하면 그대로 던진다.
  const removeTodayMeal = useCallback(async (mealRecordId) => {
    const dateKey = toDateKey(new Date())
    await dataStore.deleteMeal(mealRecordId, dateKey)
    setTodayMeals((prev) => prev.filter((m) => m.id !== mealRecordId))
  }, [])

  const todayMealsTotal = useMemo(() => sumMealRecordsNutrients(todayMeals), [todayMeals])

  const value = useMemo(
    () => ({
      authUser,
      authMode,
      effectiveUserId,
      authLoading,
      profile,
      recommended,
      profileLoading,
      profileError,
      refetchProfile,
      effectiveRecommended,
      isTempRecommended,
      tempSex,
      setTempSex,
      signup,
      login,
      loginWithGoogle,
      logout,
      saveProfile,
      todayMeal,
      setTodayMeal,
      todayMeals,
      todayMealsLoading,
      todayMealsError,
      refetchTodayMeals,
      todayMealsTotal,
      addTodayMeal,
      removeTodayMeal,
    }),
    [
      authUser,
      authMode,
      effectiveUserId,
      authLoading,
      profile,
      recommended,
      profileLoading,
      profileError,
      refetchProfile,
      effectiveRecommended,
      isTempRecommended,
      tempSex,
      setTempSex,
      signup,
      login,
      loginWithGoogle,
      logout,
      saveProfile,
      todayMeal,
      todayMeals,
      todayMealsLoading,
      todayMealsError,
      refetchTodayMeals,
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

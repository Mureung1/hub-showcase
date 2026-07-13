import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, set, remove } from '../lib/storage.js'
import { addMealRecord, getMeals, removeMealRecord, sumMealRecordsNutrients } from '../lib/mealStore.js'
import { calcAssumedRecommendedNutrients } from '../lib/nutrition.js'
import { toDateKey } from '../lib/records.js'

export const UserContext = createContext(null)

const USERS_KEY = 'users'
const SESSION_KEY = 'currentUserId'

function makeGuestId() {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `guest_${rand}`
}

function makeGuestUser() {
  return { id: makeGuestId(), isGuest: true, profile: null, recommended: null, tempSex: null }
}

// 세션이 아예 없는 최초 진입(로그인/게스트 모두 없음)이면, 렌더 시작 전에 게스트 계정을 확정해서
// users/currentUserId 두 state가 첫 렌더부터 이미 일치된 값을 갖게 한다. useEffect로 나중에
// 만들면 그 찰나에 user가 없는 상태로 라우팅 판단이 끝나버릴 수 있어 이렇게 처리한다.
function loadInitialState() {
  const users = get(USERS_KEY, [])
  const sessionId = get(SESSION_KEY, null)
  if (sessionId) return { users, currentUserId: sessionId }

  const guest = makeGuestUser()
  return { users: [...users, guest], currentUserId: guest.id }
}

export function UserProvider({ children }) {
  const [initial] = useState(loadInitialState)
  const [users, setUsers] = useState(initial.users)
  const [currentUserId, setCurrentUserId] = useState(initial.currentUserId)
  const [todayMeal, setTodayMeal] = useState(null) // MealAnalysis, /analyze -> /result 전달용(메모리만)
  const [todayMeals, setTodayMeals] = useState([]) // 오늘 먹은 끼니 목록(meal record[], mealStore, localStorage 영속)

  useEffect(() => {
    set(USERS_KEY, users)
  }, [users])

  useEffect(() => {
    if (currentUserId) {
      set(SESSION_KEY, currentUserId)
    } else {
      remove(SESSION_KEY)
    }
  }, [currentUserId])

  // 로그아웃 등으로 세션이 비면(마운트 이후) 곧바로 새 게스트를 발급해, 앱이 "아무도 없는" 상태로
  // 머무르지 않고 항상 게스트로라도 전 기능을 계속 쓸 수 있게 한다.
  useEffect(() => {
    if (currentUserId) return
    const guest = makeGuestUser()
    setUsers((prev) => [...prev, guest])
    setCurrentUserId(guest.id)
  }, [currentUserId])

  // 로그인 유저가 바뀌면 오늘 식단 목록을 localStorage에서 다시 불러온다.
  useEffect(() => {
    setTodayMeals(currentUserId ? getMeals(currentUserId, toDateKey(new Date())) : [])
  }, [currentUserId])

  const user = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId],
  )

  // 실제 프로필 기반 recommended가 있으면 그걸 우선하고, 없고 게스트가 성별만 고른 상태(tempSex)면
  // 표준 성인 가정값(calcAssumedRecommendedNutrients)으로 계산한 임시 기준을 쓴다. 프로필을 저장하면
  // recommended가 채워지며 이 임시값을 자동으로 대체한다(Profile.jsx가 저장 시 tempSex도 함께 지운다).
  const effectiveRecommended = useMemo(() => {
    if (user?.recommended) return user.recommended
    if (user?.tempSex) return calcAssumedRecommendedNutrients(user.tempSex)
    return null
  }, [user])
  const isTempRecommended = Boolean(!user?.recommended && user?.tempSex)

  const signup = useCallback(
    (id, password) => {
      if (users.some((u) => u.id === id)) {
        throw new Error('이미 존재하는 아이디입니다.')
      }
      // MVP라 비밀번호는 평문 저장. 배포 시 해시 필요.
      const newUser = { id, password, profile: null, recommended: null }
      setUsers((prev) => [...prev, newUser])
      setCurrentUserId(id)
      return newUser
    },
    [users],
  )

  const login = useCallback(
    (id, password) => {
      const found = users.find((u) => u.id === id)
      if (!found || found.password !== password) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
      }
      setCurrentUserId(id)
      return found
    },
    [users],
  )

  const logout = useCallback(() => {
    setCurrentUserId(null)
  }, [])

  const updateUser = useCallback(
    (patch) => {
      setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, ...patch } : u)))
    },
    [currentUserId],
  )

  // items: 한 번의 분석에서 나온 음식 전체(1개면 단일 메뉴, 2개 이상이면 한 끼 세트) — 하나의 끼니 기록으로 저장한다.
  const addTodayMeal = useCallback(
    (items, mealType) => {
      if (!currentUserId) return null
      const dateKey = toDateKey(new Date())
      const entry = addMealRecord(currentUserId, dateKey, { items, mealType })
      setTodayMeals(getMeals(currentUserId, dateKey))
      return entry
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
      effectiveRecommended,
      isTempRecommended,
      signup,
      login,
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
      effectiveRecommended,
      isTempRecommended,
      signup,
      login,
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

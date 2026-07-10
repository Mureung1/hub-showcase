import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, set, remove } from '../lib/storage.js'
import { addMealRecord, getMeals, removeMealRecord, sumMealRecordsNutrients } from '../lib/mealStore.js'
import { toDateKey } from '../lib/records.js'

export const UserContext = createContext(null)

const USERS_KEY = 'users'
const SESSION_KEY = 'currentUserId'

export function UserProvider({ children }) {
  const [users, setUsers] = useState(() => get(USERS_KEY, []))
  const [currentUserId, setCurrentUserId] = useState(() => get(SESSION_KEY, null))
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

  // 로그인 유저가 바뀌면 오늘 식단 목록을 localStorage에서 다시 불러온다.
  useEffect(() => {
    setTodayMeals(currentUserId ? getMeals(currentUserId, toDateKey(new Date())) : [])
  }, [currentUserId])

  const user = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId],
  )

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
    [user, signup, login, logout, updateUser, todayMeal, todayMeals, todayMealsTotal, addTodayMeal, removeTodayMeal],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}

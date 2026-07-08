import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, set, remove } from '../lib/storage.js'
import { addMeal, getMeals, removeMeal, sumNutrients } from '../lib/mealStore.js'
import { toDateKey } from '../lib/records.js'

export const UserContext = createContext(null)

const USERS_KEY = 'users'
const SESSION_KEY = 'currentUserId'

export function UserProvider({ children }) {
  const [users, setUsers] = useState(() => get(USERS_KEY, []))
  const [currentUserId, setCurrentUserId] = useState(() => get(SESSION_KEY, null))
  const [todayMeal, setTodayMeal] = useState(null) // MealAnalysis, /analyze -> /result 전달용(메모리만)
  const [todayMeals, setTodayMeals] = useState([]) // 오늘 먹은 음식 목록(mealStore, localStorage 영속)

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

  const addTodayMeal = useCallback(
    (meal) => {
      if (!currentUserId) return null
      const dateKey = toDateKey(new Date())
      const entry = addMeal(currentUserId, dateKey, meal)
      setTodayMeals(getMeals(currentUserId, dateKey))
      return entry
    },
    [currentUserId],
  )

  const removeTodayMeal = useCallback(
    (mealId) => {
      if (!currentUserId) return
      const dateKey = toDateKey(new Date())
      removeMeal(currentUserId, dateKey, mealId)
      setTodayMeals(getMeals(currentUserId, dateKey))
    },
    [currentUserId],
  )

  const todayMealsTotal = useMemo(() => sumNutrients(todayMeals), [todayMeals])

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

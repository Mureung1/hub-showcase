import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearLoginFailures,
  displayNameOf,
  formatLockMessage,
  getLockRemainingMs,
  loginIdToEmail,
  normalizeLoginId,
  recordLoginFailure,
} from '../lib/authId.js'
import { get, set } from '../lib/storage.js'
import * as dataStore from '../lib/dataStore.js'
import { fetchWithTimeout } from '../lib/fetchWithTimeout.js'
import { checkMigrationPrompt, declineMigration, migrateGuestData } from '../lib/guestMigration.js'
import { applyStreakBonus, getLevelProgress } from '../lib/levelSystem.js'
import { sumMealRecordsNutrients, sumNutrients } from '../lib/mealStore.js'
import { calcAssumedRecommendedNutrients } from '../lib/nutrition.js'
import { resolveAllClearBonuses } from '../lib/quests.js'
import { toDateKey } from '../lib/records.js'
import { supabase } from '../lib/supabase.js'
import { findLevelPillRect, playXpFly } from '../lib/xpFlyAnimation.js'

// claimQuestsAndCelebrate가 XP 획득 시 재생하는 "날아가는 +XP" 연출의 지속시간(xpFlyAnimation.js
// 기본값과 동일) — setTimeout으로 totalXp state 반영/레벨업 팝업 노출을 이 시간만큼 늦춰, 숫자가
// 애니메이션이 도착하는 시점에 맞춰 바뀌게 한다.
const XP_FLY_DURATION_MS = 700

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
  const [todayMeals, setTodayMeals] = useState([]) // 오늘 먹은 끼니 목록(meal record[], dataStore 조회)
  const [todayMealsLoading, setTodayMealsLoading] = useState(true)
  const [todayMealsError, setTodayMealsError] = useState('')
  const [migrationPrompt, setMigrationPrompt] = useState(null) // { hasProfile, mealDayCount } | null
  const [migrating, setMigrating] = useState(false)
  const [migrationError, setMigrationError] = useState('')
  // 게이미피케이션(FR-12, 리텐션 강화 v4) — totalXp/레벨업 팝업을 앱 전체가 공유하는 단일 소스로
  // 여기 둔다. 예전엔 Analyze.jsx가 로컬 state로만 들고 있어 QuestBoard.jsx(MY 탭)의 마운트 시 자동
  // 클레임은 화면에 아무 표시도 안 남았다 — claimQuestsAndCelebrate(아래)를 모든 클레임 경로가
  // 공유하게 해서 어느 화면에서 완료하든 즉시 반영되게 한다.
  const [totalXp, setTotalXp] = useState(0)
  const [levelUpPopup, setLevelUpPopup] = useState(null) // { level } | null

  // 최초 진입 시 이미 있는 세션(새로고침·앱 재시작 등)을 복원하고, 이후 로그인/로그아웃/토큰 갱신을
  // 모두 이 한 리스너로 받는다(supabase-js가 세션을 localStorage에 유지하므로 PRD FR-1.2의 "자동
  // 로그인 기본 ON"은 이 복원 경로가 그대로 충족한다). 로그인은 선택 사항이라(게스트도 앱을 그대로
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

  // 게스트<->로그인 전환 시 누적 XP도 다시 불러온다(신체정보/오늘 식단과 같은 패턴).
  useEffect(() => {
    let cancelled = false
    dataStore
      .getLevelState()
      .then(({ totalXp: xp }) => {
        if (!cancelled) setTotalXp(xp)
      })
      .catch(() => {})
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

  // authUser: Supabase 로그인 계정 정보(헤더의 닉네임 표시·로그인/로그아웃 버튼 분기 전용). 게스트는
  // null. 신체정보(profile)/권장량(recommended)은 로그인 여부와 무관하게 항상 위 상태를 그대로
  // 쓴다(게스트도 값이 있을 수 있음) — authUser에 종속시키지 않는다.
  // email은 아이디를 담기 위한 내부 합성 주소(authId.js 참고)라 화면에 그대로 노출하지 않는다 —
  // 화면에는 displayName(닉네임 > 아이디 순)을 쓴다.
  const authUser = useMemo(() => {
    if (!currentUserId || !session) return null
    return {
      id: currentUserId,
      loginId: session.user.user_metadata?.login_id ?? null,
      nickname: session.user.user_metadata?.nickname ?? null,
      displayName: displayNameOf(session.user),
    }
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

  const levelProgress = useMemo(() => getLevelProgress(totalXp), [totalXp])
  const dismissLevelUpPopup = useCallback(() => setLevelUpPopup(null), [])

  // 게이미피케이션 — 퀘스트 클레임을 부르는 모든 곳(useQuestBoard.js의 자동 클레임, 앞으로 추가될
  // "기능 써보기" 마커 클레임 등)이 공유하는 단일 진입점. claimQuest 반복 호출 + 올클리어 보너스 +
  // XP 애니메이션(playXpFly) + totalXp state 갱신(모든 useUser() 소비자가 즉시 재렌더) + 레벨업 팝업
  // 세팅까지 한 번에 처리해, 어느 화면에서 클레임이 일어나든 항상 같은 피드백이 보이게 한다.
  // authLoading 중에는 호출부(useQuestBoard.js)가 애초에 부르지 않지만, 방어적으로 한 번 더 막는다.
  const claimQuestsAndCelebrate = useCallback(
    async ({ newlyCompleted, dailyQuests, weeklyQuests, dailyClaimedIds, weeklyClaimedIds, dateKey, weekKey, streakCurrent }) => {
      if (authLoading) return { dailyClaimedIds, weeklyClaimedIds, totalXp }

      const { totalXp: totalXpBefore } = await dataStore.getLevelState()
      let totalXpAfter = totalXpBefore
      let nextDaily = dailyClaimedIds
      let nextWeekly = weeklyClaimedIds

      for (const quest of newlyCompleted ?? []) {
        const xpAwarded = applyStreakBonus(quest.xp, streakCurrent)
        const claimDateKey = quest.period === 'weekly' ? weekKey : dateKey
        // eslint-disable-next-line no-await-in-loop
        const result = await dataStore.claimQuest({ dateKey: claimDateKey, questId: quest.id, xpAwarded })
        totalXpAfter = result.totalXp
        if (quest.period === 'weekly') nextWeekly = [...nextWeekly, quest.id]
        else nextDaily = [...nextDaily, quest.id]
      }

      const bonuses = resolveAllClearBonuses({ dailyQuests, dailyClaimedIds: nextDaily, weeklyQuests, weeklyClaimedIds: nextWeekly })
      for (const bonus of bonuses) {
        const xpAwarded = applyStreakBonus(bonus.xp, streakCurrent)
        const claimDateKey = bonus.period === 'weekly' ? weekKey : dateKey
        // eslint-disable-next-line no-await-in-loop
        const result = await dataStore.claimQuest({ dateKey: claimDateKey, questId: bonus.id, xpAwarded })
        totalXpAfter = result.totalXp
        if (bonus.period === 'weekly') nextWeekly = [...nextWeekly, bonus.id]
        else nextDaily = [...nextDaily, bonus.id]
      }

      if (totalXpAfter > totalXpBefore) {
        const fromRect = { x: window.innerWidth / 2, y: window.innerHeight * 0.35 }
        playXpFly({ fromRect, toRect: findLevelPillRect() ?? fromRect, amount: totalXpAfter - totalXpBefore })

        const progressBefore = getLevelProgress(totalXpBefore)
        const progressAfter = getLevelProgress(totalXpAfter)
        setTimeout(() => {
          setTotalXp(totalXpAfter)
          if (progressAfter.level > progressBefore.level) setLevelUpPopup({ level: progressAfter.level })
        }, XP_FLY_DURATION_MS)
      }

      return { dailyClaimedIds: nextDaily, weeklyClaimedIds: nextWeekly, totalXp: totalXpAfter }
    },
    [authLoading, totalXp],
  )

  // 회원가입(PRD FR-1.1): 아이디/비밀번호/닉네임만 받아 즉시 가입 + 자동 로그인까지 끝낸다. 아이디는
  // authId.js의 규칙대로 인증용 이메일로 변환해 넘기고(그 이메일은 사용자에게 노출되지 않는다),
  // 닉네임과 원본 아이디는 user_metadata에 함께 저장해 헤더 표시에 쓴다.
  // 던지는 Error에는 어느 입력 필드의 문제인지 알리는 `field`를 실어, 호출부가 인라인 에러로 붙일 수
  // 있게 한다(중복 아이디 -> 아이디 필드 아래).
  const signup = useCallback(async ({ loginId, password, nickname }) => {
    const id = normalizeLoginId(loginId)
    const { data, error } = await supabase.auth.signUp({
      email: loginIdToEmail(id),
      password,
      options: { data: { nickname: String(nickname).trim(), login_id: id } },
    })

    if (error) {
      // 이메일(=아이디) UNIQUE 제약 위반은 GoTrue가 이 메시지로 알려준다.
      if (/already registered|already exists/i.test(error.message)) {
        throw Object.assign(new Error('이미 사용 중인 아이디예요.'), { field: 'loginId' })
      }
      throw new Error('가입에 실패했어요. 잠시 후 다시 시도해주세요.')
    }

    // 프로젝트에 이메일 확인이 켜져 있으면, GoTrue는 이미 존재하는 계정에 대해서도 에러 대신 "가짜"
    // 사용자를 돌려주며 그 사실을 identities: []로만 알린다(계정 존재 여부 노출 방지 동작).
    if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
      throw Object.assign(new Error('이미 사용 중인 아이디예요.'), { field: 'loginId' })
    }

    // PRD FR-1.1은 "가입 즉시 자동 로그인"이므로 세션이 반드시 있어야 한다. 이메일 확인이 켜져 있으면
    // signUp이 세션 없이 반환되므로, 곧바로 로그인을 한 번 더 시도해 메꾼다(확인이 꺼져 있으면 이
    // 분기는 아예 타지 않는다). 그래도 실패하면 Supabase 프로젝트 설정 문제라 그대로 알린다.
    if (!data.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginIdToEmail(id),
        password,
      })
      if (loginError) {
        throw new Error(
          '가입은 됐지만 자동 로그인에 실패했어요. 로그인 화면에서 방금 만든 아이디로 로그인해주세요.',
        )
      }
    }

    // FR-15 — 닉네임을 즉시 profiles에 반영한다(get_xp_leaderboard()가 profiles.nickname을 읽으므로,
    // 온보딩(신체정보 입력) 전에도 리더보드에 닉네임이 뜨게 하기 위함). 실패해도 가입 자체는 막지
    // 않는다 — 조용히 실패(나중에 프로필을 저장하면 이 값도 자연히 갱신될 기회가 있다).
    try {
      if (data.user?.id) {
        await supabase.from('profiles').upsert({ id: data.user.id, nickname: String(nickname).trim() })
      }
    } catch (err) {
      console.error('닉네임 초기 반영 실패:', err)
    }

    clearLoginFailures(id)
  }, [])

  // 로그인(PRD FR-1.2): 실패 사유는 구분하지 않고 항상 같은 문구를 던진다 — "없는 아이디"와 "틀린
  // 비밀번호"를 구분해 보여주면 아이디 존재 여부를 확인해주는 셈이 된다. 동일 아이디 연속 실패는
  // authId.js의 로컬 카운터로 세어 5회에서 1분 잠근다.
  const login = useCallback(async (loginId, password) => {
    const id = normalizeLoginId(loginId)

    const locked = getLockRemainingMs(id)
    if (locked > 0) throw new Error(formatLockMessage(locked))

    const { error } = await supabase.auth.signInWithPassword({ email: loginIdToEmail(id), password })
    if (error) {
      const remaining = recordLoginFailure(id)
      throw new Error(remaining > 0 ? formatLockMessage(remaining) : '아이디 또는 비밀번호가 올바르지 않습니다.')
    }

    clearLoginFailures(id)
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // FR-21 — 가입 직후(또는 재등록) 보안 질문/답을 서버에 등록한다. 로컬 session state의 갱신
  // 타이밍에 기대지 않고 supabase.auth.getSession()으로 현재 토큰을 직접 읽는다(signup() 직후
  // 호출되므로 state가 아직 반영 안 됐을 수 있음).
  const registerSecurityQuestion = useCallback(async ({ questionId, answer }) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    const token = currentSession?.access_token
    if (!token) throw new Error('로그인이 필요합니다.')

    const res = await fetchWithTimeout('/api/auth/security-question/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ questionId, answer }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || '보안 질문 등록에 실패했어요.')
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

  // 로그인 계정으로 전환될 때마다(currentUserId가 채워질 때) "옮길 게스트 데이터가 남아있고, 아직
  // 한 번도 물어본 적 없으면" 마이그레이션 프롬프트를 띄운다. checkMigrationPrompt는 순수 로컬 읽기라
  // 즉시 반환되고, 이미 답한 적 있으면(성공/거부 모두) 조용히 null을 반환해 아무 것도 뜨지 않는다.
  useEffect(() => {
    setMigrationError('')
    if (!currentUserId) {
      setMigrationPrompt(null)
      return
    }
    setMigrationPrompt(checkMigrationPrompt(currentUserId))
  }, [currentUserId])

  const acceptGuestMigration = useCallback(async () => {
    // migrating 재진입 방지: 빠르게 두 번 누르면 migrateGuestData가 같은 "이미 옮긴 날짜" 상태를 두 번
    // 읽어 시작해, 두 호출이 같은 끼니를 각각 Supabase에 중복 삽입할 수 있다(끼니 테이블엔 자연키가
    // 없어 두 번째 삽입을 막을 방법이 DB 쪽에도 없다).
    if (!currentUserId || migrating) return
    setMigrating(true)
    setMigrationError('')
    try {
      await migrateGuestData(currentUserId)
      setMigrationPrompt(null)
      // 신체정보/식단이 방금 Supabase로 올라갔으니, 화면에 이미 로드된 state도 그 결과로 다시 채운다.
      await Promise.all([refetchProfile(), refetchTodayMeals()])
    } catch (err) {
      setMigrationError(err.message || '데이터를 옮기지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setMigrating(false)
    }
  }, [currentUserId, migrating, refetchProfile, refetchTodayMeals])

  const declineGuestMigration = useCallback(() => {
    if (!currentUserId) return
    declineMigration(currentUserId)
    setMigrationPrompt(null)
  }, [currentUserId])

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

  // 트랙 2 §5 — 저장된 끼니 수정. items: 그 끼니의 새 음식 배열 전체(값을 고친 항목 포함, addTodayMeal과
  // 같은 "통째로 넘긴다" 규칙). 실패하면 그대로 던져서 호출부가 재시도 안내를 보여줄 수 있게 한다.
  const updateTodayMeal = useCallback(async (mealRecordId, items) => {
    const dateKey = toDateKey(new Date())
    const total = sumNutrients(items)
    const updated = await dataStore.updateMeal(mealRecordId, dateKey, items, total)
    setTodayMeals((prev) => prev.map((m) => (m.id === mealRecordId ? updated : m)))
    return updated
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
      logout,
      registerSecurityQuestion,
      saveProfile,
      todayMeals,
      todayMealsLoading,
      todayMealsError,
      refetchTodayMeals,
      todayMealsTotal,
      addTodayMeal,
      removeTodayMeal,
      updateTodayMeal,
      migrationPrompt,
      migrating,
      migrationError,
      acceptGuestMigration,
      declineGuestMigration,
      totalXp,
      levelProgress,
      levelUpPopup,
      dismissLevelUpPopup,
      claimQuestsAndCelebrate,
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
      logout,
      registerSecurityQuestion,
      saveProfile,
      todayMeals,
      todayMealsLoading,
      todayMealsError,
      refetchTodayMeals,
      todayMealsTotal,
      addTodayMeal,
      removeTodayMeal,
      updateTodayMeal,
      migrationPrompt,
      migrating,
      migrationError,
      acceptGuestMigration,
      declineGuestMigration,
      totalXp,
      levelProgress,
      levelUpPopup,
      dismissLevelUpPopup,
      claimQuestsAndCelebrate,
    ],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}

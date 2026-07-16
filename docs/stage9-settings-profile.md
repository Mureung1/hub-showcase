# Stage 9 — 환경설정 + 프로필 수정

> 사용자가 프로필을 수정하고, 비밀번호를 변경하며, 계정을 삭제할 수 있는 환경설정 페이지를 구현합니다.

---

## 개요

**목표:**
- 프로필 정보 수정 기능
- 비밀번호 변경 기능
- 계정 삭제 기능
- 로그인 상태 유지
- 페이지 상태 유지

**완료 상황:** ✅ 100% 완료

---

## 1. 백엔드 구현

### 1-1. Prisma 스키마 수정

**User 모델에 password 필드 추가:**

```prisma
model User {
  id        String   @id
  email     String   @unique
  password  String?  // 비밀번호 (해시)
  createdAt DateTime @default(now())
  
  // ... 기타 필드
}
```

**마이그레이션 실행:**
```bash
npx prisma migrate dev --name add_password_field
npx prisma generate
```

### 1-2. bcrypt 설치

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

### 1-3. 회원가입 수정 (POST /api/auth/signup)

**이전:**
```typescript
const user = await prisma.user.create({
  data: {
    id: userId,
    email: data.email,
  },
})
```

**수정 후:**
```typescript
const hashedPassword = await bcrypt.hash(data.password, 10)

const user = await prisma.user.create({
  data: {
    id: userId,
    email: data.email,
    password: hashedPassword,  // ✅ 비밀번호 저장
  },
})
```

### 1-4. 로그인 수정 (POST /api/auth/login)

**이전:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: data.email },
})

if (!user) {
  return res.status(401).json({ error: '...' })
}

const tokens = generateTokens(user.id)
```

**수정 후:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: data.email },
})

if (!user) {
  return res.status(401).json({ error: '...' })
}

// ✅ 비밀번호 검증
if (user.password) {
  const isPasswordValid = await bcrypt.compare(data.password, user.password)
  if (!isPasswordValid) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다' })
  }
}

const tokens = generateTokens(user.id)
```

### 1-5. 비밀번호 변경 엔드포인트

**PATCH /api/auth/password**

```typescript
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(6, '비밀번호 확인은 6자 이상이어야 합니다'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인이 일치하지 않습니다',
  path: ['confirmPassword'],
})

router.patch('/password', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const data = ChangePasswordSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
    }

    // 현재 비밀번호가 없는 경우 (OAuth만 사용)
    if (!user.password) {
      return res.status(400).json({ error: '비밀번호 기반 인증을 사용하지 않습니다' })
    }

    // 현재 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다' })
    }

    // 새 비밀번호 해싱 및 저장
    const hashedPassword = await bcrypt.hash(data.newPassword, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 데이터입니다', details: error.errors })
    }
    console.error('비밀번호 변경 실패:', error)
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다' })
  }
})
```

### 1-6. 계정 삭제 엔드포인트

**DELETE /api/auth/account**

```typescript
router.delete('/account', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
    }

    // ✅ 사용자 삭제 (cascade delete로 모든 관련 데이터 삭제)
    // - UserProfile
    // - CalendarEvent
    // - Scrap
    // - PushSubscription
    await prisma.user.delete({
      where: { id: userId },
    })

    res.json({
      success: true,
      message: '계정이 완전히 삭제되었습니다',
    })
  } catch (error: any) {
    console.error('계정 삭제 실패:', error)
    res.status(500).json({ error: '계정 삭제에 실패했습니다' })
  }
})
```

---

## 2. 프론트엔드 구현

### 2-1. SettingsPage 생성

**경로:** `frontend/src/pages/SettingsPage.tsx`

**주요 기능:**
- 좌측 사이드바 네비게이션 (CalendarPage 스타일)
- 탭 UI (프로필 정보 / 비밀번호 변경)
- 프로필 정보 수정 폼 (2열 그리드)
- 비밀번호 변경 폼
- 로그아웃 버튼
- 계정 삭제 버튼

### 2-2. 프로필 정보 수정

**구현 내용:**

```typescript
interface ProfileData {
  major?: string
  grade?: number
  residenceRegion?: string
  incomeBracket?: number
  interestTags?: string[]
}

// ProfileSetup과 일치하는 value-label 매핑
const MAJORS = [
  { value: 'HUMANITIES', label: '인문' },
  { value: 'IT', label: 'IT/컴퓨터' },
  // ...
]

const REGIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'GYEONGSAN', label: '경상' },
  // ...
]
```

**프로필 로드:**

```typescript
const loadProfile = async () => {
  try {
    setIsLoading(true)
    const response = await profileApi.fetch()
    
    const profileData = response?.data || response
    if (profileData) {
      setProfile({
        major: profileData.major || '',
        grade: profileData.grade || undefined,
        residenceRegion: profileData.residenceRegion || '',
        incomeBracket: profileData.incomeBracket || undefined,
        interestTags: Array.isArray(profileData.interestTags) ? profileData.interestTags : [],
      })
    }
  } catch (error: any) {
    console.error('프로필 로드 실패:', error)
    setMessage({ type: 'error', text: '프로필을 불러올 수 없습니다' })
  } finally {
    setIsLoading(false)
  }
}
```

**프로필 저장:**

```typescript
const handleSaveProfile = async () => {
  try {
    setIsSaving(true)
    const response = await profileApi.update(profile)
    if (response?.data) {
      setMessage({ type: 'success', text: '프로필이 성공적으로 저장되었습니다! 🎉' })
      setTimeout(() => setMessage(null), 3000)
    }
  } catch (error: any) {
    console.error('프로필 저장 실패:', error)
    setMessage({ type: 'error', text: error.message || '프로필 저장 실패' })
  } finally {
    setIsSaving(false)
  }
}
```

**폼 레이아웃 (2열 그리드):**

```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '32px',
  marginBottom: '32px',
}}>
  {/* 전공, 학년 */}
  {/* 거주지, 소득분위 */}
</div>

{/* 관심 분야 (전체 너비) */}
```

### 2-3. 비밀번호 변경

**탭 UI 추가:**

```typescript
<div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
  <button onClick={() => setActiveTab('profile')}>
    📋 프로필 정보
  </button>
  <button onClick={() => setActiveTab('password')}>
    🔐 비밀번호 변경
  </button>
</div>
```

**비밀번호 변경 폼:**

```typescript
interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const handleChangePassword = async () => {
  // 검증
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    setMessage({ type: 'error', text: '모든 필드를 입력해주세요' })
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다' })
    return
  }

  if (passwordForm.newPassword.length < 6) {
    setMessage({ type: 'error', text: '새 비밀번호는 6자 이상이어야 합니다' })
    return
  }

  try {
    setIsChangingPassword(true)
    const response = await authPasswordApi.change(
      passwordForm.currentPassword,
      passwordForm.newPassword,
      passwordForm.confirmPassword
    )

    if (response?.success) {
      setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다! 🎉' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage(null), 3000)
    }
  } catch (error: any) {
    console.error('비밀번호 변경 실패:', error)
    setMessage({ type: 'error', text: error.message || '비밀번호 변경 실패' })
  } finally {
    setIsChangingPassword(false)
  }
}
```

### 2-4. 계정 삭제

**2단계 확인 대화상자:**

```typescript
const handleDeleteAccount = async () => {
  // 1차 확인
  const confirmed = window.confirm(
    '정말로 계정을 삭제하시겠습니까?\n\n모든 프로필, 스크랩, 캘린더 정보가 완전히 삭제됩니다.'
  )

  if (!confirmed) return

  // 2차 확인 (최종)
  const finalConfirm = window.confirm(
    '⚠️ 이 작업은 되돌릴 수 없습니다.\n정말 삭제하시겠습니까?'
  )

  if (!finalConfirm) return

  try {
    await authAccountApi.delete()
    setMessage({ type: 'success', text: '계정이 삭제되었습니다. 로그인 페이지로 이동합니다.' })
    setTimeout(() => {
      tokenManager.clearTokens()
      setCurrentPage?.('auth')
    }, 2000)
  } catch (error: any) {
    console.error('계정 삭제 실패:', error)
    setMessage({ type: 'error', text: error.message || '계정 삭제 실패' })
  }
}
```

**UI:**

```typescript
{/* 로그아웃 버튼 */}
<button onClick={handleLogout} style={{ backgroundColor: '#ef4444' }}>
  🚪 로그아웃
</button>

{/* 계정 삭제 버튼 */}
<button onClick={handleDeleteAccount} style={{ backgroundColor: '#991b1b' }}>
  🗑️ 계정 삭제
</button>
```

### 2-5. API 클라이언트 확장

**frontend/src/utils/apiClient.ts:**

```typescript
// 비밀번호 변경
export const authPasswordApi = {
  change: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    return apiCall<{ success: boolean; message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })
  },
}

// 계정 삭제
export const authAccountApi = {
  delete: async () => {
    return apiCall<{ success: boolean; message: string }>('/auth/account', {
      method: 'DELETE',
    })
  },
}
```

---

## 3. 로그인 상태 유지

### 3-1. 토큰 유지 로직

**이전:**
```typescript
// 개발 환경에서는 항상 토큰 초기화
if (import.meta.env.DEV) {
  tokenManager.clearTokens()
}
```

**수정 후:**
```typescript
// 저장된 토큰 유효성만 검사
const token = tokenManager.getAccessToken()
if (token) {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    const now = Date.now() / 1000
    if (decoded.exp && decoded.exp < now) {
      console.log('⏰ 토큰 만료됨, 초기화합니다.')
      tokenManager.clearTokens()
    } else {
      console.log('✅ 저장된 토큰 유효함')
    }
  } catch (e) {
    console.log('❌ 토큰 파싱 실패, 초기화합니다.')
    tokenManager.clearTokens()
  }
}
```

**동작:**
1. 로그인 → 토큰 저장
2. 새로고침 → 토큰 유효성 검사
3. 만료 안됨 → 로그인 상태 유지
4. 만료됨 → 자동 초기화
5. 로그아웃 버튼 → 수동 초기화

---

## 4. 페이지 상태 유지

### 4-1. localStorage에 페이지 저장

**App.tsx:**

```typescript
// 현재 페이지를 localStorage에 저장
const saveCurrentPage = (page: AppPage) => {
  setCurrentPage(page)
  localStorage.setItem('currentPage', page)
}

// localStorage에서 저장된 페이지 복원
const getSavedPage = (): AppPage => {
  const saved = localStorage.getItem('currentPage')
  return (saved as AppPage) || 'auth'
}
```

### 4-2. 모든 페이지 이동에서 저장

```typescript
{currentPage === 'dashboard' && <DashboardLayout setCurrentPage={saveCurrentPage} />}
{currentPage === 'calendar' && <CalendarPage setCurrentPage={saveCurrentPage} />}
{currentPage === 'scraps' && <ScrapListPage setCurrentPage={saveCurrentPage} />}
{currentPage === 'settings' && <SettingsPage setCurrentPage={saveCurrentPage} />}
```

### 4-3. 프로필 상태 변경 시 복원

```typescript
const checkProfileAndNavigate = async (hasToken: boolean) => {
  // ...
  
  if (response?.hasProfile) {
    // 저장된 페이지가 있으면 복원
    const savedPage = getSavedPage()
    const targetPage = (savedPage !== 'auth' && savedPage !== 'profile') ? savedPage : 'dashboard'
    setCurrentPage(targetPage)
  } else {
    setCurrentPage('profile')
    localStorage.removeItem('currentPage')  // 프로필 설정 중에는 저장 X
  }
}
```

**동작:**
1. 캘린더 페이지 → 'calendar' 저장
2. 새로고침 → 'calendar' 복원
3. 로그아웃 → localStorage 초기화
4. 프로필 설정 → localStorage 제거

---

## 5. 문제 해결

### 문제 1: value-label 매핑 불일치

**증상:**
- 프로필 정보가 로드되지만 select에서 선택된 상태 표시 X
- 예: `major: "IT"` vs `<option value="공학">`

**해결:**
- ProfileSetup과 동일한 value-label 구조 사용
- `MAJORS = [{ value: 'IT', label: 'IT/컴퓨터' }]`
- select의 `value={major.value}` 사용

### 문제 2: 기존 사용자 비밀번호 오류

**증상:**
- "비밀번호 기반 인증을 사용하지 않습니다" 에러
- 기존 사용자는 password = NULL

**해결:**
- 새로 회원가입한 사용자부터 비밀번호 변경 가능
- 기존 사용자는 다시 가입 필요

### 문제 3: JSX 구조 오류

**증상:**
- "Expected corresponding JSX closing tag" 에러
- Fragment 닫기와 div 닫기 순서 혼란

**해결:**
- 탭별로 Fragment 명확히 분리
- `{activeTab === 'profile' && (<>...</>)}`
- `{activeTab === 'password' && (<>...</>)}`

---

## 6. 테스트 체크리스트

- [ ] **프로필 정보 수정**
  - [ ] 프로필 로드 확인
  - [ ] 전공, 학년, 거주지, 소득분위 수정 가능
  - [ ] 관심분야 멀티 선택
  - [ ] 저장 후 성공 메시지
  - [ ] 새로고침 시 수정된 정보 유지

- [ ] **비밀번호 변경**
  - [ ] 탭 전환 작동
  - [ ] 현재 비밀번호 검증
  - [ ] 새 비밀번호/확인 일치 검증
  - [ ] 최소 6자 검증
  - [ ] 변경 성공 메시지
  - [ ] 변경 후 로그인 가능

- [ ] **계정 삭제**
  - [ ] 2단계 확인 대화상자
  - [ ] 삭제 후 모든 데이터 제거 확인
  - [ ] 로그인 페이지로 이동
  - [ ] 토큰 초기화

- [ ] **로그인 상태**
  - [ ] 로그인 후 새로고침 → 상태 유지
  - [ ] 로그아웃 → 로그인 페이지
  - [ ] 토큰 만료 → 자동 초기화

- [ ] **페이지 상태**
  - [ ] 각 페이지에서 새로고침 → 해당 페이지 유지
  - [ ] 로그아웃 → 대시보드로 이동 안함
  - [ ] 프로필 설정 시 → 대시보드로 이동

---

## 7. 배운 점

✅ **localStorage 활용:** 클라이언트 상태 저장 (토큰, 페이지)
✅ **Cascade Delete:** Prisma의 관계 설정으로 자동 데이터 삭제
✅ **bcrypt 해싱:** 비밀번호 보안 (평문 저장 금지)
✅ **탭 UI 구현:** 같은 페이지에서 여러 섹션 관리
✅ **value-label 분리:** 코드값 vs 표시값 명확한 구분

---

## 8. 다음 단계

- [ ] Stage 10: 정책/지원금 카테고리 확장
- [ ] 배포: Vercel (프론트), Railway/Render (백엔드)
- [ ] 모니터링: 에러 추적, 성능 분석


import { useUser } from '../context/UserContext.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { colors, spacing, styles } from '../styles/theme.js'

// 식단 탭 placeholder — 데이터 연결(오늘 식사 개수)만 확인하고, 상세 UI는 다음 단계에서 채운다.
export default function MealsPage() {
  const { todayMeals } = useUser()

  return (
    <div style={styles.page}>
      <ScreenHeader title="식단" subtitle="오늘 먹은 음식을 모아볼 수 있어요" />
      <Card style={{ textAlign: 'center', padding: `${spacing.xxxl}px ${spacing.xl}px` }}>
        <p style={{ color: colors.textStrong, fontWeight: 700, marginBottom: spacing.sm }}>
          오늘 기록된 식사 {todayMeals.length}건
        </p>
        <p style={{ color: colors.textSub, margin: 0 }}>상세 화면은 준비 중입니다. 곧 만나요!</p>
      </Card>
    </div>
  )
}

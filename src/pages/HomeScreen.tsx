import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SortOption } from '@hub/shared'
import FilterChip from '../components/FilterChip'
import SubsidyCard from '../components/SubsidyCard'
import TabBar from '../components/TabBar'
import { useOnboarding } from '../context/OnboardingContext'
import {
  getDisplaySubsidies,
  SORT_CHIPS,
  sortSubsidies,
} from '../data/mockSubsidies'
import './HomeScreen.css'

function showPlaceholder() {
  window.alert('준비 중이에요')
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { profile } = useOnboarding()
  const [sort, setSort] = useState<SortOption>('match')

  const subsidies = useMemo(() => {
    const items = getDisplaySubsidies(profile)
    return sortSubsidies(items, sort)
  }, [profile, sort])

  const profileText = [
    profile.district || '내 지역',
    profile.industry || '내 업종',
    profile.employees || '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="home screen active">
      <div className="home-header">
        <div>
          <div className="greet">안녕하세요, 사장님</div>
          <div className="profile">{profileText}</div>
        </div>
        <button
          type="button"
          className="bell"
          aria-label="알림"
          onClick={showPlaceholder}
        >
          🔔
          <span className="bell-dot" />
        </button>
      </div>

      <div className="home-filters">
        {SORT_CHIPS.map((chip) => (
          <FilterChip
            key={chip.sort}
            label={chip.label}
            active={sort === chip.sort}
            onClick={() => setSort(chip.sort)}
          />
        ))}
      </div>

      <div className="home-list-label">
        내 조건에 맞는 지원금 <strong>{subsidies.length}건</strong>
      </div>

      <div className="home-cards">
        {subsidies.map((subsidy) => (
          <SubsidyCard
            key={subsidy.id}
            subsidy={subsidy}
            onClick={() => navigate(`/subsidies/${subsidy.id}`)}
          />
        ))}
      </div>

      <TabBar onPlaceholderClick={showPlaceholder} />
    </div>
  )
}

import DepartmentGraph from '../components/DepartmentGraph'

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        전공 시각화 학습실에 오신 것을 환영합니다
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        기능을 검색하거나, 학과 노드를 눌러 관련 영역을 살펴보세요.
      </p>

      <div className="mt-8">
        <DepartmentGraph />
      </div>
    </div>
  )
}

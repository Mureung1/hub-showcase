import './App.css'
import { MainLayout } from './layouts/MainLayout'

function App() {
  return (
    <MainLayout>
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          SmartFF Dashboard
        </h1>
        <p className="text-text-secondary mb-8">
          Environment setup complete. Ready for Dashboard implementation.
        </p>

        {/* Placeholder for Dashboard content */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-bg-card p-6 rounded border border-border-color">
            <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
              예상 매출
            </p>
            <p className="text-3xl font-bold text-text-primary">₩850K</p>
            <p className="text-xs text-success mt-2">↑ 5%</p>
          </div>
          <div className="bg-bg-card p-6 rounded border border-border-color">
            <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
              평균 마진율
            </p>
            <p className="text-3xl font-bold text-text-primary">32%</p>
            <p className="text-xs text-success mt-2">↑ 2%</p>
          </div>
          <div className="bg-bg-card p-6 rounded border border-border-color">
            <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
              폐기 손실
            </p>
            <p className="text-3xl font-bold text-text-primary">₩45K</p>
            <p className="text-xs text-danger mt-2">↓ 3%</p>
          </div>
          <div className="bg-bg-card p-6 rounded border border-border-color">
            <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
              우선 관리 상품
            </p>
            <p className="text-3xl font-bold text-text-primary">도시락</p>
            <p className="text-xs text-brand mt-2">발주 확대 권장</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default App

import { useMemo, useState } from 'react'
import { GAS_PRESETS } from '../../features/physicalChemistry/data/gases'
import {
  maxwellBoltzmannDistribution,
  mostProbableSpeed,
} from '../../features/physicalChemistry/lib/maxwellBoltzmann'
import GasControls from '../../features/physicalChemistry/components/GasControls'
import SpeedDistributionChart from '../../features/physicalChemistry/components/SpeedDistributionChart'
import Card from '../../components/Card'
import ChapterAssistant from '../../components/ChapterAssistant'

interface Snapshot {
  temperatureK: number
  gasId: string
}

export default function PhysicalChemistryPage() {
  const [temperatureK, setTemperatureK] = useState(298)
  const [gasId, setGasId] = useState('n2')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

  const gas = GAS_PRESETS.find((g) => g.id === gasId) ?? GAS_PRESETS[2]
  const vp = mostProbableSpeed(temperatureK, gas.molarMassKgPerMol)

  const snapshotGas = snapshot ? GAS_PRESETS.find((g) => g.id === snapshot.gasId) : undefined
  const snapshotVp =
    snapshot && snapshotGas ? mostProbableSpeed(snapshot.temperatureK, snapshotGas.molarMassKgPerMol) : 0

  const maxSpeed = Math.max(vp, snapshotVp) * 3.2

  const mainCurve = useMemo(
    () => maxwellBoltzmannDistribution(temperatureK, gas.molarMassKgPerMol, maxSpeed),
    [temperatureK, gas, maxSpeed],
  )
  const snapshotCurve = useMemo(
    () =>
      snapshot && snapshotGas
        ? maxwellBoltzmannDistribution(snapshot.temperatureK, snapshotGas.molarMassKgPerMol, maxSpeed)
        : undefined,
    [snapshot, snapshotGas, maxSpeed],
  )

  return (
    <div>
      <div className="mb-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium"
          style={{ background: 'var(--color-accent-fill)', color: 'var(--color-accent-text)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          기능 B · 사용자 탐색·조작형
        </span>
      </div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        물리화학 — 분자 속도 분포
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        같은 온도라도 기체 분자들은 전부 같은 속도로 움직이지 않습니다. 기체 종류와 온도를 바꿔가며
        속도 분포가 어떻게 달라지는지 직접 확인하세요.
      </p>

      <div className="mt-4">
        <GasControls
          temperatureK={temperatureK}
          onTemperatureChange={setTemperatureK}
          gasId={gasId}
          onGasChange={setGasId}
          onSnapshot={() => setSnapshot({ temperatureK, gasId })}
          onClearSnapshot={() => setSnapshot(null)}
          hasSnapshot={snapshot !== null}
        />
      </div>

      <div className="mt-6">
        <Card className="relative">
          <ChapterAssistant
            context={`${gas.label}, 온도 ${temperatureK}K — 최빈 속도(가장 흔한 분자 속도) 약 ${Math.round(vp)} m/s${
              snapshot && snapshotGas
                ? `. 비교선: ${snapshotGas.label}, ${snapshot.temperatureK}K, 최빈 속도 약 ${Math.round(snapshotVp)} m/s`
                : ''
            }`}
          />
          <SpeedDistributionChart
            mainCurve={mainCurve}
            mainLabel={`${gas.label} · ${temperatureK}K`}
            mainMostProbableSpeed={vp}
            snapshotCurve={snapshotCurve}
            snapshotLabel={snapshot && snapshotGas ? `${snapshotGas.label} · ${snapshot.temperatureK}K` : undefined}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Maxwell-Boltzmann 속도 분포
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            기체 분자 하나하나는 서로 다른 속도로 움직이고, 끊임없는 충돌로 그 속도도 계속 바뀝니다.
            하지만 아주 많은 분자를 한꺼번에 보면, 어떤 속도의 분자가 얼마나 많은지는 온도와 분자량에
            의해 정확히 정해진 패턴(분포)을 따릅니다. 온도를 올리면 곡선이 넓어지고 오른쪽(빠른 속도)
            으로 이동하며, 분자량이 큰(무거운) 기체일수록 곡선이 더 좁고 낮은 속도 쪽에 몰려있습니다.
            이 분포에서 활성화 에너지 이상의 속도를 가진 분자 비율이, 온도가 오르면 반응 속도가 빨라
            지는 이유의 근거가 됩니다.
          </p>
        </Card>
      </div>
    </div>
  )
}

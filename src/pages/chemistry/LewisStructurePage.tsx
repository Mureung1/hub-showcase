import { waterLewis } from '../../features/lewisStructure/data/water'
import { useLewisPlayer } from '../../features/lewisStructure/hooks/useLewisPlayer'
import LewisDiagram from '../../features/lewisStructure/components/LewisDiagram'
import MechanismControls from '../../features/organicMechanism/components/MechanismControls'
import Panel from '../../components/Panel'
import ChapterAssistant from '../../components/ChapterAssistant'

export default function LewisStructurePage() {
  const player = useLewisPlayer(waterLewis.steps)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">일반화학 — 루이스 구조 그리기</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {waterLewis.name} ({waterLewis.formula}), 원자가전자 총 {waterLewis.totalValenceElectrons}
        개를 정해진 절차대로 배치해 루이스 구조를 완성하는 과정입니다.
      </p>

      <div className="mt-6">
        <Panel title={`lewis / ${waterLewis.id}.tsx`} className="relative">
          <ChapterAssistant
            context={`${player.currentStep.title}: ${player.currentStep.description}`}
          />
          <div className="flex justify-center py-4">
            <div className="w-[300px]">
              <LewisDiagram step={player.currentStep} />
            </div>
          </div>

          <MechanismControls
            isFirst={player.isFirst}
            isDone={player.isDone}
            stepIndex={player.stepIndex}
            totalSteps={player.totalSteps}
            onStepBackward={player.stepBackward}
            onStepForward={player.stepForward}
            onReset={player.reset}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="설명">
          <h2 className="text-sm font-semibold text-zinc-100">{player.currentStep.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {player.currentStep.description}
          </p>
        </Panel>
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { ReactionTemplate } from '../data/types'
import { useMechanismPlayer } from '../hooks/useMechanismPlayer'
import MechanismStepViewer from './MechanismStepViewer'
import MechanismControls from './MechanismControls'
import ReactionTabs from './ReactionTabs'
import Panel from '../../../components/Panel'
import ChapterAssistant from '../../../components/ChapterAssistant'

interface MechanismViewerProps {
  title: string
  reactions: ReactionTemplate[]
}

export default function MechanismViewer({ title, reactions }: MechanismViewerProps) {
  const [activeId, setActiveId] = useState(reactions[0].id)
  const reaction = reactions.find((r) => r.id === activeId) ?? reactions[0]
  const player = useMechanismPlayer(reaction.steps)
  const [showDebugIndices, setShowDebugIndices] = useState(false)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{reaction.summary}</p>

      {reactions.length > 1 && (
        <div className="mt-4">
          <ReactionTabs reactions={reactions} activeId={activeId} onSelect={setActiveId} />
        </div>
      )}

      <div className="mt-6">
        <Panel title={`organic / ${reaction.id}.tsx`} className="relative">
          <ChapterAssistant context={`${player.currentStep.title}: ${player.currentStep.description}`} />
          <div className="flex justify-center py-4">
            <MechanismStepViewer
              step={player.currentStep}
              visibleArrowCount={player.visibleArrowCount}
              showDebugIndices={showDebugIndices}
            />
          </div>

          <MechanismControls
            playing={player.playing}
            isDone={player.isDone}
            stepIndex={player.stepIndex}
            totalSteps={player.totalSteps}
            speed={player.speed}
            onPlay={player.play}
            onPause={player.pause}
            onStepForward={player.stepForward}
            onReset={player.reset}
            onSpeedChange={player.setSpeed}
          />

          {import.meta.env.DEV && (
            <label className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={showDebugIndices}
                onChange={(e) => setShowDebugIndices(e.target.checked)}
              />
              원자 인덱스 표시 (콘텐츠 저작용 디버그)
            </label>
          )}
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

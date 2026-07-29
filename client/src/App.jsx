import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Start } from './screens/scr0/Start.jsx'
import { InviteCompose } from './screens/scr0/InviteCompose.jsx'
import { InviteShare } from './screens/scr0/InviteShare.jsx'
import { InviteJoin } from './screens/scr0/InviteJoin.jsx'
import { ParticipantsStatus } from './screens/scr0/ParticipantsStatus.jsx'
import { Assign } from './screens/scr2/Assign.jsx'
import { CoordinateConfirm } from './screens/scr3/CoordinateConfirm.jsx'
import { ProgressWorkspace } from './screens/scr4/ProgressWorkspace.jsx'
import { ProgressChecklist } from './screens/scr4/ProgressChecklist.jsx'
import { SoundToggle } from './components/forms/SoundToggle.jsx'
import { startBgm } from './lib/sound.js'

function App() {
  // BGM은 로드 시 바로 재생을 시도하되, 브라우저 자동재생 정책으로 막히면
  // 조용히 실패하고 첫 사용자 상호작용 시점에 재시도한다 (음소거 상태면 재생하지 않음).
  useEffect(() => {
    startBgm()
    const onFirstInteraction = () => startBgm()
    window.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true })
    window.addEventListener('keydown', onFirstInteraction, { once: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction, { capture: true })
      window.removeEventListener('keydown', onFirstInteraction, { capture: true })
    }
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/scr0" replace />} />
        <Route path="/scr0" element={<Start />} />
        <Route path="/scr0/compose" element={<InviteCompose />} />
        <Route path="/scr0/share" element={<InviteShare />} />
        <Route path="/scr0/join" element={<InviteJoin />} />
        <Route path="/scr0/status" element={<ParticipantsStatus />} />
        <Route path="/scr2/roles" element={<Assign />} />
        <Route path="/scr3/confirm" element={<CoordinateConfirm />} />
        <Route path="/scr4/workspace" element={<ProgressWorkspace />} />
        <Route path="/scr4/checklist" element={<ProgressChecklist />} />
        <Route path="*" element={<Navigate to="/scr0" replace />} />
      </Routes>
      <SoundToggle />
    </>
  )
}

export default App

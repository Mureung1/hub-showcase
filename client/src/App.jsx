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
import { HarvestReview } from './screens/scr5/HarvestReview.jsx'
import { HarvestSummary } from './screens/scr5/HarvestSummary.jsx'
import { Settlement } from './screens/scr5/Settlement.jsx'
import { Notifications } from './screens/common/Notifications.jsx'
import { Profile } from './screens/common/Profile.jsx'
import { SoundToggle } from './components/forms/SoundToggle.jsx'
import { startBgm } from './lib/sound.js'

function App() {
  // 브라우저는 사용자 제스처 이전의 재생을 막을 뿐 아니라, Howler의 HTML5 오디오
  // 언락 풀도 document capture 단계의 click/keydown에서만 채워진다. 그보다 먼저(또는
  // capture 단계에서) BGM을 재생 시도하면 풀이 비어 잠긴 오디오 노드를 받게 되므로,
  // window의 bubble 단계 click/keydown에서만 첫 재생을 시도한다 (음소거 상태면 재생 안 함).
  useEffect(() => {
    const onFirstInteraction = () => startBgm()
    window.addEventListener('click', onFirstInteraction, { once: true })
    window.addEventListener('keydown', onFirstInteraction, { once: true })
    return () => {
      window.removeEventListener('click', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
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
        <Route path="/scr5/review" element={<HarvestReview />} />
        <Route path="/scr5/summary" element={<HarvestSummary />} />
        <Route path="/scr5/settlement" element={<Settlement />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/scr0" replace />} />
      </Routes>
      <SoundToggle />
    </>
  )
}

export default App

import { Navigate, Route, Routes } from 'react-router-dom'
import { Start } from './screens/scr0/Start.jsx'
import { InviteCompose } from './screens/scr0/InviteCompose.jsx'
import { InviteShare } from './screens/scr0/InviteShare.jsx'
import { InviteJoin } from './screens/scr0/InviteJoin.jsx'
import { ParticipantsStatus } from './screens/scr0/ParticipantsStatus.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/scr0" replace />} />
      <Route path="/scr0" element={<Start />} />
      <Route path="/scr0/compose" element={<InviteCompose />} />
      <Route path="/scr0/share" element={<InviteShare />} />
      <Route path="/scr0/join" element={<InviteJoin />} />
      <Route path="/scr0/status" element={<ParticipantsStatus />} />
      <Route path="*" element={<Navigate to="/scr0" replace />} />
    </Routes>
  )
}

export default App

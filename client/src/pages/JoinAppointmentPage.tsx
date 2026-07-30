import { useNavigate } from 'react-router'
import type { JoinAppointmentResponse } from 'shared'
import JoinAppointmentForm from '../components/JoinAppointmentForm.tsx'
import { setSession } from '../lib/session.ts'

function JoinAppointmentPage() {
  const navigate = useNavigate()

  const handleJoinSuccess = (response: JoinAppointmentResponse, appointmentId: string) => {
    setSession(appointmentId, { participantId: response.participantId, role: response.role })
    navigate(`/a/${appointmentId}`)
  }

  return <JoinAppointmentForm onSuccess={handleJoinSuccess} />
}

export default JoinAppointmentPage

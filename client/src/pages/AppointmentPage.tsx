import { useParams } from 'react-router-dom'

function AppointmentPage() {
  const { id } = useParams()

  return (
    <div>
      <h1>약속 진입점</h1>
      <p>약속 ID: {id}</p>
    </div>
  )
}

export default AppointmentPage

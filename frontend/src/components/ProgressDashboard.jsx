import useCertificationProgress from '../hooks/useCertificationProgress.js'
import ProgressAddForm from './ProgressAddForm.jsx'
import ProgressList from './ProgressList.jsx'

function ProgressDashboard() {
  const { items, isLoading, error, statusFilter, setStatusFilter, addProgress, updateStatus } =
    useCertificationProgress()

  const handleStatusChange = (id, status, targetDate) => {
    updateStatus(id, { status, targetDate })
  }

  return (
    <div className="cert-planner">
      <ProgressAddForm onAdd={addProgress} />
      <ProgressList
        items={items}
        isLoading={isLoading}
        error={error}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

export default ProgressDashboard

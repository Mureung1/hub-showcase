import useCertificationRanking from '../hooks/useCertificationRanking.js'
import CertSearchForm from './CertSearchForm.jsx'
import CertRankingList from './CertRankingList.jsx'

function CertPlanner() {
  const { jobTitle, onJobTitleChange, rankings, isLoading, showValidationError, error, search } =
    useCertificationRanking()

  return (
    <div className="cert-planner">
      <CertSearchForm
        jobTitle={jobTitle}
        onJobTitleChange={onJobTitleChange}
        onSubmit={search}
        showValidationError={showValidationError}
      />
      <CertRankingList rankings={rankings} isLoading={isLoading} error={error} />
    </div>
  )
}

export default CertPlanner

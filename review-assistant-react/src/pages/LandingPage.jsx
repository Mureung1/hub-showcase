import Header from '../components/Header.jsx'
import LandingHero from '../components/landing/LandingHero.jsx'
import CoreFeatures from '../components/landing/CoreFeatures.jsx'
import ProcessSteps from '../components/landing/ProcessSteps.jsx'
import ReportPreview from '../components/landing/ReportPreview.jsx'
import IndustryList from '../components/landing/IndustryList.jsx'
import Testimonials from '../components/landing/Testimonials.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'

function LandingPage() {
  return (
    <div className="page">
      <Header />
      <LandingHero />
      <CoreFeatures />
      <ProcessSteps />
      <ReportPreview />
      <IndustryList />
      <Testimonials />
      <LandingFooter />
    </div>
  )
}

export default LandingPage

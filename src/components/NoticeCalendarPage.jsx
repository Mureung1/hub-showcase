import CampusPreferenceCard from './CampusPreferenceCard.jsx'
import SubscriptionIcsStatusCard from './SubscriptionIcsStatusCard.jsx'

export default function NoticeCalendarPage({
  copy,
  preferences,
  onSelectedCampusesChange,
}) {
  return (
    <div className="notice-calendar-page">
      <CampusPreferenceCard
        copy={copy.campusPreference}
        preferences={preferences}
        onSelectedCampusesChange={onSelectedCampusesChange}
      />
      <SubscriptionIcsStatusCard copy={copy.subscriptionIcs} />
    </div>
  )
}

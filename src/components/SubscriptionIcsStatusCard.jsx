export default function SubscriptionIcsStatusCard({ copy }) {
  return (
    <section className="calendar-card">
      <div className="calendar-card-inner">
        <div className="subscription-card-header">
          <h2>{copy.title}</h2>
          <span>{copy.badge}</span>
        </div>
        <p className="calendar-card-description">{copy.body}</p>
      </div>
    </section>
  )
}

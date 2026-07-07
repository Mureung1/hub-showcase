export default function MenuRecommendation({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div>
      {recommendations.map((item, i) => (
        <div key={i} style={{ padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>{item.name}</h3>
          <p style={{ margin: 0, color: '#555' }}>{item.reason}</p>
        </div>
      ))}
    </div>
  )
}

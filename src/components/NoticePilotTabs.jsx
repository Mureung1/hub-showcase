export default function NoticePilotTabs({ copy, activeTab }) {
  return (
    <nav className="noticepilot-tabs" aria-label={copy.ariaLabel}>
      {copy.items.map((item) => (
        <a
          key={item.id}
          className={activeTab === item.id ? 'active' : ''}
          href={item.href}
          aria-current={activeTab === item.id ? 'page' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

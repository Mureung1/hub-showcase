import './Tabs.css'

const Tabs = ({ tabs, activeKey, onChange }) => (
  <div className="tabs">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        className={`tab-btn${tab.key === activeKey ? ' active' : ''}`}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

export default Tabs

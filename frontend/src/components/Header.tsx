interface HeaderProps {
  activeTab: 'upcoming' | 'released' | 'ranking';
  setActiveTab: (tab: 'upcoming' | 'released' | 'ranking') => void;
  setActiveCategory: (cat: string) => void;
}

export default function Header({ activeTab, setActiveTab, setActiveCategory }: HeaderProps) {
  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        based on crowd consensus // forecasting next week's alternative drops // version 1.0.0
      </div>

      {/* GNB Header */}
      <header>
        <a
          href="#"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('upcoming');
            setActiveCategory('all');
          }}
        >
          dropcast*
        </a>

        <nav className="nav-filters">
          {(['upcoming', 'released', 'ranking'] as const).map((tab) => {
            const labelMap: Record<string, string> = {
              upcoming: 'upcoming 🗳️',
              released: 'hot & released 📈',
              ranking: 'ranking 🏆',
            };
            return (
              <a
                key={tab}
                href="#"
                className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab);
                  setActiveCategory('all');
                }}
              >
                {labelMap[tab]}
              </a>
            );
          })}
        </nav>

        <a
          href="#active-drops"
          className="btn-touch"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('active-drops');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          predict drops
        </a>
      </header>
    </>
  );
}

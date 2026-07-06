export default function Header({ copy, language, languages, onLanguageChange }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={copy.ariaLabel}>
        <span className="brand-mark">NP</span>
        <span>
          <strong>NoticePilot</strong>
          <small>{copy.tagline}</small>
        </span>
      </a>
      <nav className="header-nav" aria-label="Primary navigation">
        <div className="language-toggle" aria-label="Language selector">
          {Object.entries(languages).map(([languageKey, languageCopy]) => (
            <button
              key={languageKey}
              type="button"
              className={language === languageKey ? 'active' : ''}
              onClick={() => onLanguageChange(languageKey)}
            >
              {languageCopy.languageLabel}
            </button>
          ))}
        </div>
        <a href="#workspace">{copy.navCta}</a>
      </nav>
    </header>
  )
}

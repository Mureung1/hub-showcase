export const ALL_THEMES = "all";

export function getPortfolioThemeOptions(portfolios) {
  const themes = new Map();

  portfolios.forEach((portfolio) => {
    if (portfolio.themeSlug && !themes.has(portfolio.themeSlug)) {
      themes.set(portfolio.themeSlug, portfolio.themeName || portfolio.themeSlug);
    }
  });

  return [...themes].map(([slug, name]) => ({ slug, name }));
}

export function filterPortfolios(
  portfolios,
  { query = "", themeSlug = ALL_THEMES } = {},
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  return portfolios.filter((portfolio) => {
    const matchesTheme =
      themeSlug === ALL_THEMES || portfolio.themeSlug === themeSlug;
    const searchableText = [
      portfolio.name,
      portfolio.title,
      portfolio.themeName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ko-KR");

    return matchesTheme && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
}

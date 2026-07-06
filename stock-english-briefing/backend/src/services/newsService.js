const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
});

/**
 * Google News RSS search - no API key required.
 * Works for both tickers ("NVDA stock") and industry keywords ("AI data center").
 */
function buildFeedUrl(query) {
  const params = new URLSearchParams({
    q: query,
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function fetchNewsForWatchlistItem(item, limit = 5) {
  const query = item.type === 'ticker' ? `${item.value} stock` : item.value;
  const feedUrl = buildFeedUrl(query);

  const feed = await parser.parseURL(feedUrl);

  return (feed.items || []).slice(0, limit).map((entry) => ({
    title: entry.title || '',
    link: entry.link || '',
    source: entry.creator || (entry.title || '').split(' - ').pop() || 'Unknown',
    publishedAt: entry.isoDate || entry.pubDate || null,
    // Google News RSS content snippets are short; used only for term matching,
    // never republished as long-form text.
    snippet: entry.contentSnippet || '',
  }));
}

module.exports = { fetchNewsForWatchlistItem, buildFeedUrl };

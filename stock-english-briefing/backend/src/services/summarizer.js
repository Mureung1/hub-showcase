const financialTerms = require('../data/financialTerms.json');

// Sorted longest-first so multi-word terms ("beat expectations") match
// before shorter substrings ("beat").
const TERMS_BY_LENGTH = [...financialTerms].sort((a, b) => b.term.length - a.term.length);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchedTerms(text) {
  const lowerText = text.toLowerCase();
  const matches = [];
  const claimed = new Set();

  for (const entry of TERMS_BY_LENGTH) {
    const regex = new RegExp(`\\b${escapeRegExp(entry.term.toLowerCase())}\\b`, 'i');
    const found = regex.exec(lowerText);
    if (found && !claimed.has(entry.term)) {
      claimed.add(entry.term);
      matches.push(entry);
    }
  }
  return matches;
}

/**
 * Summarizer interface: a summarizer takes a news article
 * ({ title, snippet, link }) and a watchlist item, and returns
 * { summaryKr, keySentenceEn, matchedTerms }.
 *
 * Deliberately produces facts only ("what happened"), never buy/sell
 * recommendations, to stay clear of investment-advice territory.
 */
class RuleBasedSummarizer {
  summarize(article, watchlistItem) {
    const sourceText = `${article.title} ${article.snippet || ''}`;
    const matchedTerms = findMatchedTerms(sourceText);

    const keySentenceEn = article.title;

    const summaryKr = this.buildKoreanSummary(article, watchlistItem, matchedTerms);

    return { summaryKr, keySentenceEn, matchedTerms };
  }

  buildKoreanSummary(article, watchlistItem, matchedTerms) {
    const subject = watchlistItem.label;
    if (matchedTerms.length === 0) {
      return `[${subject}] 관련 새 기사가 있습니다: "${article.title}" (자세한 내용은 원문 링크를 확인하세요)`;
    }
    const glossary = matchedTerms
      .map((t) => `${t.term}(${t.meaningKr})`)
      .join(', ');
    return `[${subject}] 관련 기사입니다: "${article.title}" — 이 기사에는 다음 핵심 표현이 포함되어 있습니다: ${glossary}`;
  }
}

module.exports = { RuleBasedSummarizer, findMatchedTerms };

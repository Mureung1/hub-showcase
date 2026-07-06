const express = require('express');
const db = require('../db');
const { fetchNewsForWatchlistItem } = require('../services/newsService');
const { RuleBasedSummarizer } = require('../services/summarizer');
const { recordTermsSeen } = require('../services/vocabService');

const router = express.Router();
const summarizer = new RuleBasedSummarizer();

// GET /api/briefing -> today's briefing cards for every watchlist item
router.get('/', async (req, res) => {
  const watchlist = db.prepare('SELECT * FROM watchlist ORDER BY created_at ASC').all();

  const cards = await Promise.all(
    watchlist.map(async (item) => {
      try {
        const articles = await fetchNewsForWatchlistItem(item, 5);
        const briefedArticles = articles.map((article) => {
          const { summaryKr, keySentenceEn, matchedTerms } = summarizer.summarize(article, item);
          recordTermsSeen(matchedTerms);
          return {
            title: article.title,
            link: article.link,
            source: article.source,
            publishedAt: article.publishedAt,
            summaryKr,
            keySentenceEn,
            matchedTerms,
          };
        });
        return { watchlistItem: item, articles: briefedArticles, error: null };
      } catch (err) {
        return { watchlistItem: item, articles: [], error: 'Failed to fetch news for this item' };
      }
    })
  );

  res.json(cards);
});

module.exports = router;

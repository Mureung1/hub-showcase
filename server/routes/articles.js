const express = require('express');
const rateLimit = require('express-rate-limit');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');
const { searchNews } = require('../services/naver');
const { fetchArticleBody } = require('../services/scraper');
const { summarizeArticle, simplifyArticle } = require('../services/openai');

const router = express.Router();

const SIMPLIFY_LEVELS = ['easy', 'medium'];

const summaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

// :id, :id/summary 둘 다 본문이 필요해서 공용으로 뺌 — content 없으면 스크래핑해서 채워준다
async function getArticleWithContent(id) {
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, source, content, url, published_at')
    .eq('id', id)
    .single();

  if (error || !article) return null;

  if (!article.content) {
    const content = await fetchArticleBody(article.url);
    if (content) {
      await supabase.from('articles').update({ content }).eq('id', article.id);
      article.content = content;
    }
  }

  return article;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch (err) {
    return 'unknown';
  }
}

// 이 키워드로 네이버에서 최신 기사를 가져와 articles/article_keywords에 upsert한다
// (content는 여기서 채우지 않음 — 목록엔 필요 없고, 상세 조회 시점에만 크롤링한다)
async function ingestKeywordArticles(keywordId, keywordName) {
  const items = await searchNews(keywordName, { display: 20, sort: 'date' });

  const rows = items.map((item) => ({
    url: item.url,
    title: item.title,
    source: hostnameOf(item.url),
    published_at: item.publishedAt,
  }));

  const { data: articles, error } = await supabase
    .from('articles')
    .upsert(rows, { onConflict: 'url' })
    .select('id');

  if (error || !articles) return;

  const links = articles.map((article) => ({ article_id: article.id, keyword_id: keywordId }));

  await supabase
    .from('article_keywords')
    .upsert(links, { onConflict: 'article_id,keyword_id' });
}

router.get('/', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  const { data: userKeywords, error: keywordsError } = await supabase
    .from('user_keywords')
    .select('keyword_id, keywords(name)')
    .eq('user_id', req.user.id);

  if (keywordsError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (userKeywords.length === 0) {
    return res.json([]);
  }

  await Promise.all(
    userKeywords.map((uk) => ingestKeywordArticles(uk.keyword_id, uk.keywords.name))
  );

  const keywordNameById = new Map(userKeywords.map((uk) => [uk.keyword_id, uk.keywords.name]));

  const { data: matches, error: matchError } = await supabase
    .from('article_keywords')
    .select('article_id, keyword_id')
    .in('keyword_id', [...keywordNameById.keys()]);

  if (matchError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  const keywordsByArticleId = new Map();
  for (const match of matches) {
    const names = keywordsByArticleId.get(match.article_id) || [];
    names.push(keywordNameById.get(match.keyword_id));
    keywordsByArticleId.set(match.article_id, names);
  }

  const articleIds = [...keywordsByArticleId.keys()];
  if (articleIds.length === 0) {
    return res.json([]);
  }

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, source, thumbnail_url, published_at')
    .in('id', articleIds)
    .order('published_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (articlesError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json(
    articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      thumbnailUrl: article.thumbnail_url,
      publishedAt: article.published_at,
      keywords: keywordsByArticleId.get(article.id) || [],
    }))
  );
});

router.get('/:id', auth, async (req, res) => {
  const article = await getArticleWithContent(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({
    id: article.id,
    title: article.title,
    content: article.content || null,
    source: article.source,
    publishedAt: article.published_at,
    terms: [], // 용어 해설(article_terms)은 다음 커밋에서
  });
});

router.get('/:id/summary', auth, summaryLimiter, async (req, res) => {
  const { data: cached, error: cacheError } = await supabase
    .from('article_summaries')
    .select('content')
    .eq('article_id', req.params.id)
    .maybeSingle();

  if (cacheError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (cached) {
    return res.json({ content: cached.content });
  }

  const article = await getArticleWithContent(req.params.id);
  if (!article || !article.content) {
    return res.status(404).json({ error: 'not_found' });
  }

  const content = await summarizeArticle(article.content);

  await supabase
    .from('article_summaries')
    .insert({ article_id: req.params.id, content });

  res.json({ content });
});

router.get('/:id/simplify', auth, summaryLimiter, async (req, res) => {
  const { level } = req.query;

  if (!SIMPLIFY_LEVELS.includes(level)) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const { data: cached, error: cacheError } = await supabase
    .from('summaries')
    .select('content')
    .eq('article_id', req.params.id)
    .eq('difficulty_level', level)
    .maybeSingle();

  if (cacheError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (cached) {
    return res.json({ level, content: cached.content });
  }

  const article = await getArticleWithContent(req.params.id);
  if (!article || !article.content) {
    return res.status(404).json({ error: 'not_found' });
  }

  const content = await simplifyArticle(article.content, level);

  await supabase
    .from('summaries')
    .insert({ article_id: req.params.id, difficulty_level: level, content });

  res.json({ level, content });
});

router.post('/:id/read', auth, async (req, res) => {
  const { error } = await supabase
    .from('read_history')
    .upsert(
      { user_id: req.user.id, article_id: req.params.id },
      { onConflict: 'user_id,article_id' }
    );

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({ success: true });
});

module.exports = router;

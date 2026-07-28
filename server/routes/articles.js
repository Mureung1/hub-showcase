const express = require('express');
const rateLimit = require('express-rate-limit');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');
const { searchNews } = require('../services/naver');
const { fetchArticleBody } = require('../services/scraper');
const { summarizeArticle, simplifyArticle, extractTerms } = require('../services/openai');

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

// article_terms에 이미 뽑아둔 용어가 있으면 그걸 쓰고, 없으면(이 기사를 처음 여는 거라면) GPT로 추출해서 저장해둔다
async function ensureArticleTerms(article) {
  const { data: existing, error: existingError } = await supabase
    .from('article_terms')
    .select('explanation, terms(term)')
    .eq('article_id', article.id);

  if (existingError) return [];
  if (existing.length > 0) {
    return existing.map((row) => ({ term: row.terms.term, explanation: row.explanation }));
  }

  if (!article.content) return [];

  const extracted = await extractTerms(article.content);
  if (extracted.length === 0) return [];

  const { data: termRows, error: termsError } = await supabase
    .from('terms')
    .upsert(
      extracted.map((t) => ({ term: t.term })),
      { onConflict: 'term' }
    )
    .select('id, term');

  if (termsError || !termRows) return [];

  const termIdByName = new Map(termRows.map((t) => [t.term, t.id]));

  const articleTermRows = extracted
    .filter((t) => termIdByName.has(t.term))
    .map((t) => ({
      article_id: article.id,
      term_id: termIdByName.get(t.term),
      explanation: t.explanation,
    }));

  await supabase.from('article_terms').insert(articleTermRows);

  return extracted;
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

  try {
    await Promise.all(
      userKeywords.map((uk) => ingestKeywordArticles(uk.keyword_id, uk.keywords.name))
    );
  } catch (err) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  const keywordNameById = new Map(userKeywords.map((uk) => [uk.keyword_id, uk.keywords.name]));

  // article_id를 따로 모아 .in('id', articleIds)로 재조회하던 방식은 매칭되는 기사가 쌓일수록
  // URL이 길어지다가 결국 HTTP 헤더 크기 제한(HeadersOverflowError)을 넘겨버림 — 조인 임베딩으로 한 번에 가져옴
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, source, thumbnail_url, published_at, article_keywords!inner(keyword_id)')
    .in('article_keywords.keyword_id', [...keywordNameById.keys()])
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
      keywords: article.article_keywords.map((ak) => keywordNameById.get(ak.keyword_id)),
    }))
  );
});

// '/:id'보다 먼저 등록해야 함 — 안 그러면 '/read'가 :id="read"로 매칭돼버림
router.get('/read', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('read_history')
    .select('read_at, articles(id, title, source, thumbnail_url, published_at)')
    .eq('user_id', req.user.id)
    .order('read_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json(
    data.map((row) => ({
      id: row.articles.id,
      title: row.articles.title,
      source: row.articles.source,
      thumbnailUrl: row.articles.thumbnail_url,
      publishedAt: row.articles.published_at,
      readAt: row.read_at,
    }))
  );
});

router.get('/:id', auth, async (req, res) => {
  const article = await getArticleWithContent(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'not_found' });
  }

  const terms = await ensureArticleTerms(article);

  res.json({
    id: article.id,
    title: article.title,
    content: article.content || null,
    source: article.source,
    publishedAt: article.published_at,
    terms,
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

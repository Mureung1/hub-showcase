const express = require('express');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');
const { searchNews } = require('../services/naver');
const { fetchArticleBody } = require('../services/scraper');

const router = express.Router();

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
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, source, content, url, published_at')
    .eq('id', req.params.id)
    .single();

  if (error || !article) {
    return res.status(404).json({ error: 'not_found' });
  }

  let content = article.content;
  if (!content) {
    content = await fetchArticleBody(article.url);
    if (content) {
      await supabase.from('articles').update({ content }).eq('id', article.id);
    }
  }

  res.json({
    id: article.id,
    title: article.title,
    content: content || null,
    source: article.source,
    publishedAt: article.published_at,
    terms: [], // 용어 해설(article_terms)은 7/22 예정 — 지금은 빈 배열
  });
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

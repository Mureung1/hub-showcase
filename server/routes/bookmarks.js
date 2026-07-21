const express = require('express');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, articles(id, title, source, thumbnail_url, published_at)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json(
    data.map((bookmark) => ({
      id: bookmark.id,
      article: {
        id: bookmark.articles.id,
        title: bookmark.articles.title,
        source: bookmark.articles.source,
        thumbnailUrl: bookmark.articles.thumbnail_url,
        publishedAt: bookmark.articles.published_at,
      },
    }))
  );
});

router.post('/', auth, async (req, res) => {
  const { articleId } = req.body;

  if (!articleId) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .upsert(
      { user_id: req.user.id, article_id: articleId },
      { onConflict: 'user_id,article_id' }
    )
    .select('id, article_id')
    .single();

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({ id: data.id, articleId: data.article_id });
});

router.delete('/:articleId', auth, async (req, res) => {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', req.user.id)
    .eq('article_id', req.params.articleId);

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({ success: true });
});

module.exports = router;

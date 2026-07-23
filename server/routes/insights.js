const express = require('express');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/clusters', auth, async (req, res) => {
  const { data: latest, error: latestError } = await supabase
    .from('clusters')
    .select('batch_date')
    .eq('user_id', req.user.id)
    .order('batch_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (!latest) {
    return res.json([]); // 아직 클러스터링 배치가 안 돌았거나 읽은 기사가 부족한 경우
  }

  const { data: clusters, error } = await supabase
    .from('clusters')
    .select('id, title, description, cluster_articles(count)')
    .eq('user_id', req.user.id)
    .eq('batch_date', latest.batch_date);

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  // 카드에 보여줄 대표 기사(최신 2개)는 클러스터마다 따로 조회 — 클러스터 수가 적어서 N+1이어도 괜찮음
  const clustersWithArticles = await Promise.all(
    clusters.map(async (cluster) => {
      const { data: representative } = await supabase
        .from('cluster_articles')
        .select('articles(id, title, published_at)')
        .eq('cluster_id', cluster.id)
        .order('published_at', { foreignTable: 'articles', ascending: false })
        .limit(2);

      return {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description,
        articleCount: cluster.cluster_articles[0]?.count || 0,
        articles: (representative || []).map((row) => ({
          id: row.articles.id,
          title: row.articles.title,
        })),
      };
    })
  );

  res.json(clustersWithArticles);
});

router.get('/clusters/:id', auth, async (req, res) => {
  const { data: cluster, error } = await supabase
    .from('clusters')
    .select('id, title, description, user_id')
    .eq('id', req.params.id)
    .single();

  if (error || !cluster || cluster.user_id !== req.user.id) {
    return res.status(404).json({ error: 'not_found' });
  }

  const { data: clusterArticles, error: articlesError } = await supabase
    .from('cluster_articles')
    .select('articles(id, title, source, thumbnail_url, published_at)')
    .eq('cluster_id', req.params.id);

  if (articlesError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({
    id: cluster.id,
    title: cluster.title,
    description: cluster.description,
    articles: clusterArticles.map((row) => ({
      id: row.articles.id,
      title: row.articles.title,
      source: row.articles.source,
      thumbnailUrl: row.articles.thumbnail_url,
      publishedAt: row.articles.published_at,
    })),
  });
});

module.exports = router;

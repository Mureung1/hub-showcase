require('dotenv').config({ path: '.env.local' });
const { kmeans } = require('ml-kmeans');
const supabase = require('../services/supabase');
const { createEmbedding, describeCluster } = require('../services/openai');

const MIN_ARTICLES_TO_CLUSTER = 3; // 이보다 적게 읽었으면 클러스터링 의미가 없다고 보고 스킵
const MAX_CLUSTERS = 5;

function pickClusterCount(articleCount) {
  return Math.max(1, Math.min(MAX_CLUSTERS, Math.floor(articleCount / 3)));
}

// pgvector 컬럼은 PostgREST를 거치면 "[0.1,0.2,...]" 형태의 문자열로 오기 때문에 숫자 배열로 변환
function parseEmbedding(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

async function ensureEmbedding(article) {
  const existing = parseEmbedding(article.embedding);
  if (existing) return existing;

  const text = article.content || article.title;
  const embedding = await createEmbedding(text);
  await supabase.from('articles').update({ embedding }).eq('id', article.id);
  return embedding;
}

async function clusterForUser(userId) {
  const { data: readRows, error } = await supabase
    .from('read_history')
    .select('articles(id, title, content, embedding)')
    .eq('user_id', userId);

  if (error || !readRows) {
    console.error(`  유저 ${userId} read_history 조회 실패:`, error?.message);
    return;
  }

  // 같은 기사를 여러 번 읽었을 수 있어 article id 기준으로 중복 제거
  const articleMap = new Map();
  for (const row of readRows) {
    if (row.articles) articleMap.set(row.articles.id, row.articles);
  }
  const articles = [...articleMap.values()];

  if (articles.length < MIN_ARTICLES_TO_CLUSTER) {
    console.log(`  유저 ${userId}: 읽은 기사 ${articles.length}개 — 최소 기준(${MIN_ARTICLES_TO_CLUSTER}) 미달, 스킵`);
    return;
  }

  const embeddings = [];
  for (const article of articles) {
    embeddings.push(await ensureEmbedding(article));
  }

  const k = pickClusterCount(articles.length);
  const result = kmeans(embeddings, k, { seed: 42 });
  const batchDate = new Date().toISOString().slice(0, 10);

  for (let clusterIndex = 0; clusterIndex < k; clusterIndex++) {
    const memberArticles = articles.filter((_, i) => result.clusters[i] === clusterIndex);
    if (memberArticles.length === 0) continue;

    const { title, description } = await describeCluster(memberArticles.map((a) => a.title));

    const { data: cluster, error: clusterError } = await supabase
      .from('clusters')
      .insert({ user_id: userId, batch_date: batchDate, title, description })
      .select('id')
      .single();

    if (clusterError || !cluster) {
      console.error('  클러스터 저장 실패:', clusterError?.message);
      continue;
    }

    const links = memberArticles.map((a) => ({ cluster_id: cluster.id, article_id: a.id }));
    const { error: linkError } = await supabase.from('cluster_articles').insert(links);
    if (linkError) console.error('  cluster_articles 저장 실패:', linkError.message);

    console.log(`  클러스터 생성: "${title}" (${memberArticles.length}개 기사)`);
  }
}

async function main() {
  const { data: users, error } = await supabase.from('profiles').select('id');
  if (error) {
    console.error('유저 목록 조회 실패:', error.message);
    process.exit(1);
  }

  for (const user of users) {
    console.log(`유저 ${user.id} 클러스터링 시작`);
    await clusterForUser(user.id);
  }

  console.log('클러스터링 배치 완료');
}

main();

// 04_insight.html 와이어프레임의 클러스터 카드. 미니 스파크라인은 뺐음 —
// 클러스터가 batch_date마다 새로 만들어지는 구조라 "최근 4주 추이"를 보여주려면
// 날짜를 넘어 같은 클러스터를 이어붙이는 별도 설계가 필요해서 다음 기회로 미룸.
const LABEL_COLORS = ['text-primary', 'text-tertiary', 'text-secondary'];

export default function ClusterCard({ cluster, colorIndex = 0 }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md flex flex-col">
      <div className="flex justify-between items-start gap-stack-sm mb-stack-sm">
        <span
          className={`font-label-mono text-label-mono uppercase font-bold ${LABEL_COLORS[colorIndex % LABEL_COLORS.length]}`}
        >
          {cluster.title}
        </span>
        <span className="font-label-mono text-label-mono text-on-surface-variant bg-white border border-outline-variant px-2 py-0.5 rounded-full shrink-0">
          {cluster.articleCount}개 기사
        </span>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant italic leading-relaxed mb-stack-md">
        {cluster.description}
      </p>

      {cluster.articles?.length > 0 && (
        <div className="border-t border-outline-variant pt-stack-sm mt-auto flex flex-col gap-1">
          {cluster.articles.map((article) => (
            <p key={article.id} className="font-body-md text-body-md text-on-surface">
              · {article.title}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

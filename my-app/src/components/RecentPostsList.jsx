import Card from "./Card";

function formatDate(isoString) {
  return isoString.slice(0, 10).replaceAll("-", ".");
}

function RecentPostsList({ posts, onViewAll }) {
  return (
    <Card>
      <div className="flex justify-between items-center mb-lg">
        <h2 className="font-headline-sm text-headline-sm">최근 게시물</h2>
        <button
          onClick={onViewAll}
          className="text-body-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          전체 보기
        </button>
      </div>

      <div className="space-y-md">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-md p-xs hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
              {post.thumbnailUrl && (
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )}
            </div>
            <div className="flex-grow">
              <h4 className="font-body-md font-semibold text-on-surface">{post.title}</h4>
              <p className="text-body-sm text-on-surface-variant">
                {formatDate(post.publishedAt)} · 조회 {post.viewCount.toLocaleString()}
              </p>
            </div>
            <span className="material-symbols-outlined text-outline group-hover:text-primary">
              chevron_right
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default RecentPostsList;

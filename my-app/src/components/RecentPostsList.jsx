import Card from "./Card";

function formatDate(isoString) {
  return isoString.slice(0, 10).replaceAll("-", ".");
}

function RecentPostsList({ posts, onViewAll, onDelete, onCheckDeleted }) {
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
            onClick={() => post.publishedUrl && window.open(post.publishedUrl, "_blank", "noopener,noreferrer")}
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCheckDeleted?.(post);
              }}
              className="opacity-0 group-hover:opacity-100 p-xs rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-all"
              aria-label="네이버에서 삭제됐는지 확인"
              title="네이버에서 확인"
            >
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(post.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-xs rounded-lg text-outline hover:text-error hover:bg-error/10 transition-all"
              aria-label="게시물 기록 삭제"
              title="기록 삭제"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
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

export function ResultLoading({ color }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: color, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium mb-1">AI가 콘텐츠를 쓰고 있어요</p>
        <p className="text-xs text-muted-foreground">날씨·요일 맥락을 반영하는 중...</p>
      </div>
    </div>
  );
}

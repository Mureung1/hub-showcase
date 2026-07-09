function InterviewTopBar({ storeName, title, onBack }) {
  const initials = storeName.slice(0, 2);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-md md:px-container-margin h-16 bg-surface-container-lowest shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-xs cursor-pointer active:opacity-80 transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-outline">arrow_back</span>
        <span className="font-label-md text-label-md text-on-surface-variant">뒤로</span>
      </button>

      <div className="absolute left-1/2 -translate-x-1/2">
        <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-md">
        <div className="flex items-center gap-xs bg-surface-container px-sm py-xs rounded-full cursor-pointer hover:bg-surface-container-high transition-colors">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
            {initials}
          </div>
          <span className="font-label-md text-label-md">{storeName}</span>
        </div>
        <button
          aria-label="설정"
          className="material-symbols-outlined text-outline cursor-pointer hover:text-primary transition-colors"
        >
          settings
        </button>
      </div>
    </header>
  );
}

export default InterviewTopBar;

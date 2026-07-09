function TopBar({ storeName }) {
  const initials = storeName.slice(0, 2);

  return (
    <header className="bg-surface-container-lowest sticky top-0 z-50 shadow-sm border-b border-outline-variant">
      <div className="flex justify-between items-center w-full px-container-margin py-sm max-w-full">
        <div className="flex items-center gap-md">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            알리장
          </span>
          <nav className="hidden md:flex ml-xl items-center gap-lg">
            <a
              href="#"
              className="text-primary font-bold border-b-2 border-primary pb-xs transition-colors duration-200"
            >
              홈
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              운영 분석
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              홍보 관리
            </a>
            <a
              href="#"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              발행 내역
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs px-md py-xs bg-surface-container-low rounded-full">
            <span className="font-label-md text-label-md text-on-surface">
              {storeName}
            </span>
          </div>
          <button
            aria-label="알림"
            className="material-symbols-outlined text-on-surface-variant cursor-pointer active:opacity-80"
          >
            notifications
          </button>
          <button
            aria-label="설정"
            className="material-symbols-outlined text-on-surface-variant cursor-pointer active:opacity-80"
          >
            settings
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold overflow-hidden border border-outline-variant">
            <span className="text-label-sm">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;

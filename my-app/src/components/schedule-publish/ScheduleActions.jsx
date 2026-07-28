function ScheduleActions({ onBack, onPublishNow }) {
  return (
    <div className="pt-lg border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-md">
      <button
        type="button"
        onClick={onBack}
        className="text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors px-md py-sm"
      >
        이전으로
      </button>
      <div className="flex items-center gap-md w-full md:w-auto">
        <button
          type="button"
          onClick={onPublishNow}
          className="flex-1 md:flex-none px-xl py-md bg-primary text-on-primary rounded-xl font-bold shadow-soft hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-xs"
        >
          <span className="material-symbols-outlined">open_in_new</span>
          네이버에 게시
        </button>
      </div>
    </div>
  );
}

export default ScheduleActions;

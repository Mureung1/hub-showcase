function ScheduleActions({ onBack, onPublishNow, onSchedule, isSubmitting }) {
  return (
    <div className="pt-lg border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-md">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors px-md py-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        이전으로
      </button>
      <div className="flex items-center gap-md w-full md:w-auto">
        {onPublishNow && (
          <button
            type="button"
            onClick={onPublishNow}
            className="flex-1 md:flex-none px-xl py-md border border-outline-variant rounded-xl font-bold hover:bg-surface-container-high transition-all text-on-surface"
          >
            즉시 발행
          </button>
        )}
        <button
          type="button"
          onClick={onSchedule}
          disabled={isSubmitting}
          className="flex-1 md:flex-none px-xl py-md bg-primary text-on-primary rounded-xl font-bold shadow-soft hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">schedule_send</span>
          {isSubmitting ? "예약 중..." : "예약 발행"}
        </button>
      </div>
    </div>
  );
}

export default ScheduleActions;

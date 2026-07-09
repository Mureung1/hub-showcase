function AIHelperCard({ onApply }) {
  return (
    <div className="bg-primary-container/10 border-2 border-dashed border-primary/30 rounded-xl p-lg flex flex-col items-center justify-center text-center gap-md">
      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary">
        <span className="material-symbols-outlined">auto_awesome</span>
      </div>
      <div>
        <h3 className="font-label-md text-label-md font-bold text-primary">
          AI 추천 시간을 적용하시겠어요?
        </h3>
        <p className="text-on-surface-variant font-body-sm text-body-sm mt-xs">
          가장 성과가 좋은 시간으로 설정됩니다.
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="w-full bg-primary text-on-primary font-bold py-sm rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] shadow-soft"
      >
        추천 시간 적용
      </button>
    </div>
  );
}

export default AIHelperCard;

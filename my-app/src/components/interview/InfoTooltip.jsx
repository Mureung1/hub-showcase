function InfoTooltip({ text }) {
  return (
    <div className="relative group">
      <span className="material-symbols-outlined text-outline text-[18px] cursor-help">
        info
      </span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-md py-sm bg-inverse-surface text-inverse-on-surface text-label-sm rounded-lg w-[240px] opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-10 shadow-lg">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-inverse-surface" />
      </div>
    </div>
  );
}

export default InfoTooltip;

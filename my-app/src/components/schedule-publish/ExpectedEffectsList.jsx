const COLOR_STYLES = {
  primary: { bg: "bg-primary-fixed", text: "text-primary" },
  secondary: { bg: "bg-secondary-fixed", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-fixed", text: "text-tertiary" },
};

function ExpectedEffectsList({ effects }) {
  return (
    <div className="flex flex-col gap-md">
      <h3 className="font-headline-sm text-headline-sm px-xs">예상 효과</h3>
      <div className="flex flex-col gap-sm">
        {effects.map((effect) => {
          const style = COLOR_STYLES[effect.colorKey];
          return (
            <div
              key={effect.title}
              className="bg-white/80 backdrop-blur-md rounded-lg p-md flex items-center gap-md border border-outline-variant hover:translate-x-1 transition-transform"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                <span className="material-symbols-outlined">{effect.icon}</span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md font-bold">{effect.title}</h4>
                <p className="text-on-surface-variant font-body-sm text-body-sm">
                  {effect.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExpectedEffectsList;

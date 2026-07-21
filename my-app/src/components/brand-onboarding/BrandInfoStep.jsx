import CategoryGrid from "./CategoryGrid";
import TargetChips from "./TargetChips";

function BrandInfoStep({ value, onChange, onNext }) {
  const canProceed =
    value.brandName.trim().length > 0 &&
    value.mainProduct.trim().length > 0 &&
    value.strength.trim().length > 0 &&
    value.tone.trim().length > 0 &&
    value.goal.trim().length > 0;

  const setField = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  const toggleTarget = (target) => {
    const targets = value.targets.includes(target)
      ? value.targets.filter((t) => t !== target)
      : [...value.targets, target];
    onChange({ ...value, targets });
  };

  return (
    <main className="flex flex-col items-center py-xl px-md">
      <div className="w-full max-w-[800px] mb-xl">
        <div className="flex justify-between items-end mb-xs">
          <span className="text-primary font-bold font-label-md">Step 1 / 3</span>
          <span className="text-on-surface-variant font-label-md">기본 정보 입력</span>
        </div>
        <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
          <div className="h-full bg-primary-container transition-all duration-500 ease-out" style={{ width: "33.33%" }} />
        </div>
      </div>

      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
        <div className="p-lg md:p-xl border-b border-outline-variant/20 bg-gradient-to-r from-white to-surface-container-low">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">브랜드 정보 등록</h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            AI가 사장님의 비즈니스를 학습하여 맞춤형 마케팅을 제안해드립니다.
          </p>
        </div>

        <div className="p-lg md:p-xl flex flex-col gap-xl">
          <div className="flex flex-col gap-md">
            <label className="block font-headline-sm text-headline-sm text-on-surface">업종 선택</label>
            <CategoryGrid value={value.category} onChange={(category) => onChange({ ...value, category })} />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="brand-name">
              브랜드명
            </label>
            <input
              id="brand-name"
              type="text"
              value={value.brandName}
              onChange={setField("brandName")}
              placeholder="브랜드 이름을 입력해주세요"
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="brand-intro">
              브랜드 한 줄 소개
            </label>
            <textarea
              id="brand-intro"
              value={value.oneLineIntro}
              onChange={setField("oneLineIntro")}
              placeholder="예: 우리 동네에서 가장 편안한 디저트 카페"
              rows={2}
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <label className="block font-headline-sm text-headline-sm text-on-surface">주요 타겟</label>
              <span className="text-label-md text-on-surface-variant">중복 선택 가능</span>
            </div>
            <TargetChips value={value.targets} onToggle={toggleTarget} />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="main-product">
              대표 상품(서비스)
            </label>
            <input
              id="main-product"
              type="text"
              value={value.mainProduct}
              onChange={setField("mainProduct")}
              placeholder="예: 티라미수, 아인슈페너"
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="strength">
              우리 가게만의 강점
            </label>
            <input
              id="strength"
              type="text"
              value={value.strength}
              onChange={setField("strength")}
              placeholder="예: 가성비 좋은 디저트"
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="tone">
              원하는 말투
            </label>
            <input
              id="tone"
              type="text"
              value={value.tone}
              onChange={setField("tone")}
              placeholder="예: 친근하고 다정한 말투"
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-sm">
            <label className="block font-headline-sm text-headline-sm text-on-surface" htmlFor="goal">
              홍보 목표
            </label>
            <input
              id="goal"
              type="text"
              value={value.goal}
              onChange={setField("goal")}
              placeholder="예: 신규 고객 유치"
              className="w-full px-md py-sm border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </div>

        <div className="p-lg bg-surface-container-low/50 flex justify-end border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="bg-primary-container text-on-primary px-xl py-md rounded-lg font-headline-sm flex items-center gap-xs hover:bg-primary transition-all active:scale-95 shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 단계로
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-[800px] mt-xl grid grid-cols-1 md:grid-cols-3 gap-lg opacity-80">
        <div className="flex items-start gap-md">
          <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-2xl">auto_awesome</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface font-bold">AI 맞춤 분석</p>
            <p className="text-body-sm text-body-sm text-on-surface-variant">입력하신 정보로 최적의 마케팅 타겟을 도출합니다.</p>
          </div>
        </div>
        <div className="flex items-start gap-md">
          <div className="w-10 h-10 rounded-full bg-tertiary-fixed/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-2xl">shield_person</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface font-bold">데이터 보안</p>
            <p className="text-body-sm text-body-sm text-on-surface-variant">사장님의 브랜드 정보는 안전하게 보호됩니다.</p>
          </div>
        </div>
        <div className="flex items-start gap-md">
          <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-2xl">speed</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface font-bold">빠른 시작</p>
            <p className="text-body-sm text-body-sm text-on-surface-variant">3분이면 우리 가게만의 AI 마케터가 생성됩니다.</p>
          </div>
        </div>
      </div>

      <p className="mt-xl text-center text-on-surface-variant/60 font-label-sm text-label-sm">
        © 2026 알리장. All rights reserved.
      </p>
    </main>
  );
}

export default BrandInfoStep;

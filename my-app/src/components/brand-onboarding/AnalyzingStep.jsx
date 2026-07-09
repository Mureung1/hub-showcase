import { useEffect, useState } from "react";
import { mockBrandProfile } from "../../api/mocks/dashboard";

const STATUS_ITEMS = ["비즈니스 성격 분석 완료", "지역구 타겟팅 전략 수립 완료", "맞춤형 보이스톤 설정 중..."];

function AnalyzingStep({ onComplete }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex-1 min-h-screen flex items-center justify-center p-md relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary-container/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-secondary-container/20 blur-3xl rounded-full pointer-events-none opacity-60" />

      <div className="relative z-10 w-full max-w-[600px] bg-surface-container-lowest rounded-xl shadow-soft border border-outline-variant p-xl flex flex-col items-center text-center">
        {!done ? (
          <>
            <header className="mb-xl">
              <h1 className="font-headline-md text-headline-md text-on-surface mb-sm">AI 브랜드 분석 중</h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[400px] mx-auto">
                입력하신 정보를 바탕으로 사장님의 브랜드를 분석하고 있습니다.
              </p>
            </header>

            <div className="relative w-64 h-64 mb-xl flex items-center justify-center">
              <div className="absolute w-48 h-48 border border-primary/20 rounded-full animate-[pulse-custom_3s_ease-in-out_infinite]" />
              <div className="absolute w-36 h-36 border border-secondary/20 rounded-full animate-[pulse-custom_4s_ease-in-out_infinite_reverse]" />
              <div className="relative z-20 w-32 h-32 bg-white rounded-xl shadow-soft border border-outline-variant overflow-hidden flex items-center justify-center">
                <span className="material-symbols-outlined text-primary !text-[56px]">smart_toy</span>
                <div className="scanning-line" />
              </div>
              <div className="absolute w-4 h-4 bg-primary rounded-full animate-[orbit_5s_linear_infinite]" />
              <div className="absolute w-3 h-3 bg-secondary rounded-full animate-[orbit_7s_linear_infinite_reverse]" />
              <div
                className="absolute w-2 h-2 bg-tertiary-container rounded-full animate-[orbit_4s_linear_infinite]"
                style={{ animationDelay: "1s" }}
              />
            </div>

            <div className="w-full max-w-[360px] flex flex-col gap-md mb-xl">
              {STATUS_ITEMS.map((label, i) => {
                const isLast = i === STATUS_ITEMS.length - 1;
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between p-sm rounded-lg border transition-all duration-500 ${
                      isLast ? "bg-white border-2 border-primary/10 shadow-sm" : "bg-surface-container-low border-outline-variant"
                    }`}
                  >
                    <div className="flex items-center gap-sm">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full ${
                          isLast ? "bg-primary-container text-on-primary" : "bg-secondary text-on-secondary"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined !text-[16px] ${isLast ? "animate-spin" : ""}`}
                          style={!isLast ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {isLast ? "sync" : "check"}
                        </span>
                      </div>
                      <span className={`font-label-md text-label-md ${isLast ? "text-primary font-semibold" : "text-on-surface"}`}>
                        {label}
                      </span>
                    </div>
                    {isLast && (
                      <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: "45%" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled
              className="w-full py-md rounded-lg font-label-md text-label-md bg-surface-container-highest text-on-surface-variant cursor-not-allowed"
            >
              잠시만 기다려주세요
            </button>
            <p className="mt-md font-label-sm text-label-sm text-outline">약 10초 정도 소요될 수 있습니다.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-lg">
              <span
                className="material-symbols-outlined text-primary text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">AI가 이해한 우리 브랜드</h1>
            <div className="w-full bg-surface-container-low p-lg rounded-lg mb-md">
              <p className="text-body-lg text-body-lg text-on-surface italic">"{mockBrandProfile.summary}"</p>
            </div>
            <div className="flex flex-wrap justify-center gap-xs mb-xl">
              {mockBrandProfile.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-md py-xs bg-secondary-container text-on-secondary-container rounded-full font-label-md text-label-md"
                >
                  #{keyword}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-md rounded-lg font-label-md text-label-md bg-primary text-on-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-soft flex items-center justify-center gap-xs"
            >
              메인으로 이동
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default AnalyzingStep;

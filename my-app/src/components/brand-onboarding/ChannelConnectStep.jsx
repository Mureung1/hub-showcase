function ChannelConnectStep({ connected, onConnect, onDisconnect, onPrev, onNext }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-md">
      <div className="w-full max-w-[800px] bg-white rounded-xl border border-outline-variant shadow-soft overflow-hidden">
        <div className="px-container-margin pt-xl pb-md border-b border-surface-container-highest">
          <div className="flex justify-between items-end">
            <div>
              <span className="font-label-md text-label-md text-primary bg-primary-fixed px-sm py-1 rounded-full mb-sm inline-block">
                Step 2 / 3
              </span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">마케팅 채널 연결</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                게시글 발행을 위해 사장님의 SNS 계정을 연결해주세요.
              </p>
            </div>
            <div className="hidden sm:block text-primary font-bold font-headline-sm text-headline-sm">알리장</div>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-xl overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: "66.6%" }}
            />
          </div>
        </div>

        <div className="p-container-margin flex flex-col gap-md">
          <div
            className={`flex items-center justify-between p-lg rounded-xl border transition-all ${
              connected ? "bg-surface-container-low border-outline-variant" : "bg-white border-outline-variant hover:border-primary"
            }`}
          >
            <div className="flex items-center gap-md">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center text-on-secondary shrink-0">
                <span className="font-bold font-headline-sm text-headline-sm">N</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm">네이버 블로그</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">네이버 블로그 자동 포스팅 활성화</p>
              </div>
            </div>
            {connected ? (
              <div className="flex items-center gap-sm">
                <div className="flex items-center gap-xs text-secondary px-md py-sm bg-secondary-container/30 rounded-lg font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  연결됨
                </div>
                <button
                  type="button"
                  onClick={onDisconnect}
                  aria-label="연결 해제"
                  title="연결 해제"
                  className="p-xs text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined">link_off</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                className="px-lg py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-all active:scale-95 shadow-soft"
              >
                연결하기
              </button>
            )}
          </div>

          <div className="mt-md p-md bg-secondary-container/20 border border-secondary/20 rounded-lg flex items-start gap-sm">
            <span className="material-symbols-outlined text-secondary mt-0.5">auto_awesome</span>
            <div>
              <p className="font-label-md text-label-md text-secondary">AI 권장 사항</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                사용하시던 블로그를 연동하면 더욱 최적화된 마케팅 효과를 낼 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="p-container-margin pt-0 pb-xl flex justify-between items-center">
          <button
            type="button"
            onClick={onPrev}
            className="px-xl py-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-lg font-label-md text-label-md transition-all flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            이전
          </button>
          <div className="flex items-center gap-md">
            <button
              type="button"
              onClick={onNext}
              className="text-on-surface-variant hover:text-primary underline font-label-md text-label-md transition-colors"
            >
              나중에 연결하기
            </button>
            <button
              type="button"
              onClick={onNext}
              className="bg-primary hover:bg-primary/90 text-on-primary px-xl py-sm rounded-lg font-label-md text-label-md transition-all shadow-soft active:scale-95 flex items-center gap-xs"
            >
              다음 단계로
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-lg text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          계정 연결에 어려움이 있으신가요?{" "}
          <span className="text-primary font-medium cursor-pointer hover:underline">도움말 센터 방문</span>
        </p>
      </div>
    </main>
  );
}

export default ChannelConnectStep;

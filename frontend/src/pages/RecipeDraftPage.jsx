import { useLocation } from "react-router";

function RecipeDraftPage() {
  const { state } = useLocation();

  return (
    <main className="grid min-h-dvh place-items-center bg-[#17241f] px-6 text-[#272923]">
      <section className="w-full max-w-xl rounded-md bg-[#f8f5eb] p-8">
        <p className="text-sm text-[#8b6e35]">초안 작성 완료</p>
        <h1 className="mt-2 text-2xl font-semibold">{state.draft.title}</h1>
        <p className="mt-4 text-sm text-[#626157]">
          입력해주신 내용을 바탕으로 정리한 초안입니다. 내용을 확인하고 수정해주세요.
        </p>
      </section>
    </main>
  );
}

export default RecipeDraftPage;

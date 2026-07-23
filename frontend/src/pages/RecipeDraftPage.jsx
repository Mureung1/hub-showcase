import { useLocation, useNavigate } from "react-router";
import RecipeDraftForm from "../components/RecipeDraftForm";

function RecipeDraftPage({ onSubmit = () => { } }) {
  const { state } = useLocation();
  const navigate = useNavigate();

  function handleCancel() {
    navigate("/recipes/new");
  }

  return (
    <main className="min-h-dvh bg-[#17241f] px-3 py-4 text-[#272923] sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[5px] border border-[#d8cfbd] bg-[#f8f5eb] p-4 shadow-[0_18px_50px_rgba(8,31,25,0.28)] sm:p-8">
        <header className="border-b border-[#d8cfbd] pb-6">
          <p className="text-sm font-semibold text-[#8b6e35]">
            초안 작성 완료
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            레시피 초안 확인
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#626157]">
            입력해주신 내용을 바탕으로 정리한 초안입니다. 내용을 확인하고
            수정해주세요.
          </p>
        </header>

        <RecipeDraftForm
          initialDraft={state.draft}
          warnings={state.warnings}
          onCancel={handleCancel}
          onSubmit={onSubmit}
        />
      </section>
    </main>
  );
}

export default RecipeDraftPage;

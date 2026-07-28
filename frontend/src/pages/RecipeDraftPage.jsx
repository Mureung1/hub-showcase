import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { createRecipe } from "../api/recipeApi";
import { useAuth } from "../auth/authContext";
import RecipeDraftForm from "../components/RecipeDraftForm";

function RecipeDraftPage() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);

  function handleCancel() {
    navigate("/recipes/new");
  }

  async function handleSave(draft) {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError("");

    try {
      if (!user) {
        throw new Error("로그인 정보를 확인할 수 없습니다.");
      }

      const idToken = await user.getIdToken();
      const createdRecipe = await createRecipe(idToken, {
        ...draft,
        memo: null,
      });

      navigate(`/recipes/${createdRecipe.id}`, {
        replace: true,
      });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "레시피를 저장하지 못했습니다.",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
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
          onSubmit={handleSave}
          isSubmitting={isSaving}
          submitError={saveError}
        />
      </section>
    </main>
  );
}

export default RecipeDraftPage;

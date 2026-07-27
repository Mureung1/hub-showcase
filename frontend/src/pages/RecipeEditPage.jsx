import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getRecipeDetail, updateRecipe } from "../api/recipeApi";
import { useAuth } from "../auth/authContext";
import RecipeDraftForm from "../components/RecipeDraftForm";

function toEditableDraft(recipeDetail) {
  return {
    title: recipeDetail.title,
    description: recipeDetail.description,
    servings: recipeDetail.servings,
    cookingTimeMinutes: recipeDetail.cookingTimeMinutes,
    ingredients: recipeDetail.ingredients,
    steps: recipeDetail.steps,
    source: recipeDetail.source,
  };
}

function RecipeEditPage() {
  const { user } = useAuth();
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const [recipeDraft, setRecipeDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isSavingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecipe() {
      if (!user || !recipeId) {
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const idToken = await user.getIdToken();
        const recipeDetail = await getRecipeDetail(idToken, recipeId);

        if (isCancelled) {
          return;
        }

        if (recipeDetail.type === "RECEIVED") {
          navigate(`/recipes/${recipeDetail.id}`, { replace: true });
          return;
        }

        setRecipeDraft(toEditableDraft(recipeDetail));
      } catch (error) {
        if (!isCancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "레시피를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isCancelled = true;
    };
  }, [navigate, recipeId, user]);

  function handleCancel() {
    navigate(`/recipes/${recipeId}`);
  }

  async function handleSave(draft) {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError("");

    try {
      if (!user || !recipeId) {
        throw new Error("로그인 정보를 확인할 수 없습니다.");
      }

      const idToken = await user.getIdToken();
      const updatedRecipe = await updateRecipe(idToken, recipeId, draft);

      navigate(`/recipes/${updatedRecipe.id}`, { replace: true });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "레시피를 수정하지 못했습니다.",
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
            저장된 레시피
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            레시피 원본 수정
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#626157]">
            저장된 내용을 수정하면 재료, 조리 단계와 출처가 새 내용으로
            바뀝니다.
          </p>
        </header>

        {isLoading ? (
          <p className="mt-8 text-sm text-[#626157]" role="status">
            레시피를 불러오는 중입니다.
          </p>
        ) : null}

        {!isLoading && loadError ? (
          <div className="mt-8" role="alert">
            <p className="text-sm text-[#8a3f2b]">{loadError}</p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#b8aa8f] px-4 text-sm font-semibold text-[#55544d]"
              to={`/recipes/${recipeId}`}
            >
              상세로 돌아가기
            </Link>
          </div>
        ) : null}

        {recipeDraft ? (
          <RecipeDraftForm
            initialDraft={recipeDraft}
            warnings={[]}
            onCancel={handleCancel}
            onSubmit={handleSave}
            isSubmitting={isSaving}
            submitError={saveError}
            isSourceEditable
          />
        ) : null}
      </section>
    </main>
  );
}

export default RecipeEditPage;

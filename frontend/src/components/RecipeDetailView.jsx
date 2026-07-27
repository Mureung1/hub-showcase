import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import TransferInvitationShareSection from "./TransferInvitationShareSection";

const typeLabels = {
  OWNED: "직접 작성",
  EXTERNAL: "외부 출처",
  RECEIVED: "전달받음",
};

function RecipeDetailView({
  isReceivedRecipeSaved,
  isCookingMode,
  onCookingModeChange,
  onDelete,
  recipeDetail,
  recipeId,
  user,
}) {
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isTransferShareOpen, setIsTransferShareOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const isDeletePendingRef = useRef(false);
  const deleteTriggerRef = useRef(null);
  const deleteCancelButtonRef = useRef(null);
  const canEditOriginal =
    recipeDetail.type === "OWNED" || recipeDetail.type === "EXTERNAL";
  const isReceived = recipeDetail.type === "RECEIVED";
  const deleteActionLabel = isReceived
    ? "내 레시피북에서 제거"
    : "레시피 삭제";
  const deleteDialogTitle = isReceived
    ? "내 레시피북에서 제거할까요?"
    : "레시피를 삭제할까요?";

  useEffect(() => {
    if (isDeleteDialogOpen) {
      deleteCancelButtonRef.current?.focus();
    }
  }, [isDeleteDialogOpen]);

  function handleOpenDeleteDialog() {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  function handleCloseDeleteDialog() {
    if (isDeletePendingRef.current) {
      return;
    }

    setDeleteError("");
    setIsDeleteDialogOpen(false);
    deleteTriggerRef.current?.focus();
  }

  async function handleConfirmDelete() {
    if (isDeletePendingRef.current) {
      return;
    }

    isDeletePendingRef.current = true;
    setIsDeleting(true);
    setDeleteError("");

    try {
      await onDelete();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "레시피를 삭제하지 못했습니다.",
      );
    } finally {
      isDeletePendingRef.current = false;
      setIsDeleting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-[50px_42px_38px] max-[1100px]:p-[38px_42px] max-[700px]:p-[25px_22px_24px] short-screen:p-[30px_34px_24px]">
      <section aria-label="레시피 상세">
        {!isCookingMode ? (
          <Link
            to="/recipes"
            className="inline-flex min-h-11 items-center text-sm text-[#4f5b50] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a] min-[1101px]:hidden"
          >
            ← 목록
          </Link>
        ) : null}

        <header className="border-b border-[#c9bea7] pb-5 max-[700px]:pt-2">
          <p className="text-xs font-semibold tracking-[0.08em] text-[#8b6e35]">
            {typeLabels[recipeDetail.type]}
          </p>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[0.04em] max-[700px]:text-[25px]">
            {recipeDetail.title}
          </h2>
          {recipeDetail.description ? (
            <p className="mt-3 text-sm leading-6 text-[#626157]">
              {recipeDetail.description}
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap gap-2 text-xs text-[#626157]">
              {recipeDetail.servings ? (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-[#d8cfbd] px-2.5 py-1">
                  {recipeDetail.servings}
                </span>
              ) : null}
              {recipeDetail.cookingTimeMinutes !== null ? (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-[#d8cfbd] px-2.5 py-1">
                  {recipeDetail.cookingTimeMinutes}분
                </span>
              ) : null}
            </div>
            {!isCookingMode ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="min-h-8 rounded-lg border border-[#b8aa8f] px-3 text-sm font-semibold text-[#55544d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a]"
                  aria-label="⋯ 관리"
                  aria-controls="recipe-management-actions"
                  aria-expanded={isManagementOpen}
                  onClick={() => setIsManagementOpen((isOpen) => !isOpen)}
                >
                  ⋯
                </button>
                {isManagementOpen ? (
                  <ul
                    id="recipe-management-actions"
                    aria-label="관리 작업"
                    className="absolute right-0 top-12 z-10 min-w-36 overflow-hidden rounded-lg border border-[#c9bea7] bg-[#fbf8ef] py-1 shadow-lg"
                  >
                    {canEditOriginal ? (
                      <li>
                        <Link
                          className="flex min-h-11 items-center px-4 text-sm text-[#31523d] hover:bg-[#eee7d9] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#15332a]"
                          to={`/recipes/${recipeId}/edit`}
                        >
                          원본 수정
                        </Link>
                      </li>
                    ) : null}
                    {recipeDetail.type === "OWNED" ? (
                      <li>
                        <button
                          type="button"
                          className="min-h-11 w-full px-4 text-left text-sm text-[#31523d] hover:bg-[#eee7d9] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#15332a]"
                          onClick={() => {
                            setIsTransferShareOpen(true);
                            setIsManagementOpen(false);
                          }}
                        >
                          전달 공유
                        </button>
                      </li>
                    ) : null}
                    <li>
                      <button
                        type="button"
                        ref={deleteTriggerRef}
                        className="min-h-11 w-full px-4 text-left text-sm text-[#31523d] hover:bg-[#eee7d9] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#15332a]"
                        onClick={handleOpenDeleteDialog}
                      >
                        {deleteActionLabel}
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <label
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[#31523d]"
        >
          <span>조리 중 보기</span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={isCookingMode}
            onChange={(event) =>
              onCookingModeChange(event.target.checked)
            }
          />
          <span
            aria-hidden="true"
            className="relative h-7 w-14 rounded-full bg-[#b8ad97] transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-[#fbf8ef] after:shadow-sm after:transition-transform peer-checked:bg-[#15332a] peer-checked:after:translate-x-7 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#15332a] motion-reduce:transition-none motion-reduce:after:transition-none"
          />
          <span aria-hidden="true" className="text-xs text-[#626157]">
            {isCookingMode ? "켜짐" : "꺼짐"}
          </span>
        </label>

        {isReceivedRecipeSaved ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-[#9eaa82] bg-[#eef1df] px-4 py-3 text-sm font-semibold text-[#31523d]"
          >
            전달받은 레시피를 저장했습니다.
          </p>
        ) : null}

        {recipeDetail.receivedInfo ? (
          <section
            className="mt-6 rounded-lg border border-[#c9bea7] bg-[#f1ecdf] p-4"
            aria-labelledby="received-memory-heading"
          >
            <h3
              id="received-memory-heading"
              className="text-lg font-semibold"
            >
              전달받은 기억
            </h3>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-[#777469]">원 저장자</dt>
              <dd>{recipeDetail.receivedInfo.originalOwner.name}</dd>
              <dt className="text-[#777469]">전해준 사람</dt>
              <dd>{recipeDetail.receivedInfo.senderDisplayName}</dd>
              <dt className="text-[#777469]">관계</dt>
              <dd>{recipeDetail.receivedInfo.relationshipLabel}</dd>
            </dl>
            {recipeDetail.memo ? (
              <p className="mt-4 border-t border-[#d8cfbd] pt-3 text-sm leading-6 text-[#626157]">
                {recipeDetail.memo}
              </p>
            ) : null}
            {!recipeDetail.receivedInfo.canReshare ? (
              <p className="mt-3 text-xs text-[#777469]">
                전달받은 레시피는 다시 공유할 수 없습니다.
              </p>
            ) : null}
          </section>
        ) : null}

        {recipeDetail.type === "OWNED" ? (
          <div hidden={isCookingMode || !isTransferShareOpen}>
            <TransferInvitationShareSection
              recipeId={recipeId}
              user={user}
            />
          </div>
        ) : null}

        <section
          className="mt-6"
          aria-labelledby="recipe-ingredients-heading"
        >
          <h3
            id="recipe-ingredients-heading"
            className="text-lg font-semibold"
          >
            재료
          </h3>
          {recipeDetail.ingredients.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#e0d8c8] border-y border-[#d8cfbd]">
              {recipeDetail.ingredients.map((ingredient) => (
                <li
                  key={ingredient.order}
                  className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"
                >
                  <span>{ingredient.name}</span>
                  <span className="text-right text-[#626157]">
                    {[ingredient.amount, ingredient.unit]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#777469]">
              등록된 재료가 없습니다.
            </p>
          )}
        </section>

        <section
          className="mt-7"
          aria-labelledby="recipe-steps-heading"
        >
          <h3
            id="recipe-steps-heading"
            className="text-lg font-semibold"
          >
            조리 순서
          </h3>
          {recipeDetail.steps.length > 0 ? (
            <ol className="mt-3 space-y-4">
              {recipeDetail.steps.map((step) => (
                <li
                  key={step.order}
                  className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-6"
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#15332a] text-xs text-[#f3e1b4]"
                    aria-hidden="true"
                  >
                    {step.order}
                  </span>
                  <span>{step.description}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[#777469]">
              등록된 조리 순서가 없습니다.
            </p>
          )}
        </section>

        {recipeDetail.source ? (
          <section
            className="mt-7 border-t border-[#c9bea7] pt-5"
            aria-labelledby="recipe-source-heading"
          >
            <h3
              id="recipe-source-heading"
              className="text-sm font-semibold"
            >
              출처
            </h3>
            {isCookingMode ? (
              <p className="mt-2 text-sm text-[#31523d]">
                {recipeDetail.source.title ?? recipeDetail.source.url}
              </p>
            ) : (
              <a
                href={recipeDetail.source.url}
                className="mt-2 inline-block text-sm text-[#31523d] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a]"
              >
                {recipeDetail.source.title ?? recipeDetail.source.url}
              </a>
            )}
            {recipeDetail.source.author ? (
              <p className="mt-1 text-xs text-[#777469]">
                {recipeDetail.source.author}
              </p>
            ) : null}
          </section>
        ) : null}
      </section>

      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-[#061c16]/55 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseDeleteDialog();
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              !isDeletePendingRef.current
            ) {
              event.preventDefault();
              handleCloseDeleteDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recipe-dialog-title"
            className="w-full max-w-sm rounded-xl border border-[#c9bea7] bg-[#fbf8ef] p-6 shadow-xl"
          >
            <h3
              id="delete-recipe-dialog-title"
              className="text-xl font-semibold text-[#272923]"
            >
              {deleteDialogTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#626157]">
              {isReceived
                ? "내 레시피북에 저장된 항목만 제거됩니다. 원 작성자의 레시피와 다른 사용자의 레시피에는 영향을 주지 않습니다."
                : "삭제하면 내 레시피북의 일반 목록과 상세에서 사라집니다."}
            </p>
            {deleteError ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-[#c79181] bg-[#fcf1ed] px-3 py-2 text-sm text-[#7f3c29]"
              >
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                ref={deleteCancelButtonRef}
                className="min-h-11 rounded-lg border border-[#b8aa8f] px-4 text-sm font-semibold text-[#55544d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a] disabled:cursor-wait disabled:opacity-70"
                disabled={isDeleting}
                onClick={handleCloseDeleteDialog}
              >
                취소
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg bg-[#7f3c29] px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f3c29] disabled:cursor-wait disabled:opacity-70"
                aria-busy={isDeleting}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? "처리 중" : deleteActionLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default RecipeDetailView;

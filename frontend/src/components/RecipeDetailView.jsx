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
  recipeDetail,
  recipeId,
  user,
}) {
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
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#626157]">
            {recipeDetail.servings ? (
              <span className="rounded-full border border-[#d8cfbd] px-2.5 py-1">
                {recipeDetail.servings}
              </span>
            ) : null}
            {recipeDetail.cookingTimeMinutes !== null ? (
              <span className="rounded-full border border-[#d8cfbd] px-2.5 py-1">
                {recipeDetail.cookingTimeMinutes}분
              </span>
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
          <div hidden={isCookingMode}>
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
    </div>
  );
}

export default RecipeDetailView;

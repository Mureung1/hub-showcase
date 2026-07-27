import { useState, useRef } from "react";

function normalizeOptionalText(value) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function RecipeDraftForm({
  initialDraft,
  warnings,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = "",
  isSourceEditable = false,
}) {
  const [draft, setDraft] = useState({
    ...initialDraft,
    description: initialDraft.description ?? "",
    servings: initialDraft.servings ?? "",
    cookingTimeMinutes: initialDraft.cookingTimeMinutes ?? "",
  });
  const [titleError, setTitleError] = useState("");
  const [cookingTimeError, setCookingTimeError] = useState("");
  const [ingredientNameErrors, setIngredientNameErrors] = useState([]);
  const [stepErrors, setStepErrors] = useState([]);

  const titleInputRef = useRef(null);
  const cookingTimeInputRef = useRef(null);
  const ingredientNameInputRefs = useRef([]);
  const stepInputRefs = useRef([]);

  function getWarning(field) {
    const warning = warnings.find((item) => item.field === field);

    return warning
      ? {
        ...warning,
        id: `warning-${field.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      }
      : null;
  }

  function getDescribedBy(...ids) {
    return ids.filter(Boolean).join(" ") || undefined;
  }

  const titleWarning = getWarning("title");
  const descriptionWarning = getWarning("description");
  const servingsWarning = getWarning("servings");
  const cookingTimeWarning = getWarning("cookingTimeMinutes");

  const labelClassName = "block text-sm font-semibold text-[#34362f]";
  const fieldClassName =
    "mt-2 w-full rounded-[8px] border border-[#c9bea7] bg-[rgb(255_255_255_/_48%)] px-3.5 py-3 text-sm text-[#272923] outline-none focus-visible:border-[#8b6e35] focus-visible:ring-2 focus-visible:ring-[#d8bd78]";
  const errorClassName = "mt-2 text-xs text-[#8a3f2b]";
  const warningClassName =
    "mt-2 rounded-md border border-[#d8c89d] bg-[#f3ecda] px-3 py-2 text-xs leading-5 text-[#5d563f]";
  const secondaryButtonClassName =
    "min-h-10 rounded-lg border border-[#b8aa8f] bg-[rgb(255_255_255_/_32%)] px-3 text-xs font-semibold text-[#55544d] transition-colors hover:bg-[#efe7d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd78] disabled:cursor-not-allowed disabled:opacity-40";
  const deleteButtonClassName =
    "min-h-10 rounded-lg border border-[#c8a99b] bg-[rgb(255_255_255_/_32%)] px-3 text-xs font-semibold text-[#7b3d2e] transition-colors hover:bg-[#f2dfd6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd78] disabled:cursor-not-allowed disabled:opacity-40";

  function handleChange(event) {
    const { name, value } = event.target;

    setDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }));
  }

  function handleIngredientChange(index, field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ingredients: currentDraft.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    }));
  }

  function handleAddIngredient() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ingredients: [
        ...currentDraft.ingredients,
        {
          name: "",
          amount: null,
          unit: null,
          order: currentDraft.ingredients.length + 1,
        },
      ],
    }));
  }

  function handleRemoveIngredient(index) {
    setDraft((currentDraft) => {
      if (currentDraft.ingredients.length === 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        ingredients: currentDraft.ingredients
          .filter((_, ingredientIndex) => ingredientIndex !== index)
          .map((ingredient, ingredientIndex) => ({
            ...ingredient,
            order: ingredientIndex + 1,
          })),
      };
    });
  }

  function handleMoveIngredient(index, offset) {
    setDraft((currentDraft) => {
      const targetIndex = index + offset;

      if (
        targetIndex < 0 ||
        targetIndex >= currentDraft.ingredients.length
      ) {
        return currentDraft;
      }

      const ingredients = [...currentDraft.ingredients];

      [ingredients[index], ingredients[targetIndex]] = [
        ingredients[targetIndex],
        ingredients[index],
      ];

      return {
        ...currentDraft,
        ingredients: ingredients.map((ingredient, ingredientIndex) => ({
          ...ingredient,
          order: ingredientIndex + 1,
        })),
      };
    });
  }

  function handleStepChange(index, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      steps: currentDraft.steps.map((step, stepIndex) =>
        stepIndex === index
          ? { ...step, description: value }
          : step,
      ),
    }));
  }

  function handleSourceChange(field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      source: {
        url: "",
        title: null,
        author: null,
        ...currentDraft.source,
        [field]: value,
      },
    }));
  }

  function handleAddStep() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      steps: [
        ...currentDraft.steps,
        {
          order: currentDraft.steps.length + 1,
          description: "",
        },
      ],
    }));
  }

  function handleRemoveStep(index) {
    setDraft((currentDraft) => {
      if (currentDraft.steps.length === 1) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        steps: currentDraft.steps
          .filter((_, stepIndex) => stepIndex !== index)
          .map((step, stepIndex) => ({
            ...step,
            order: stepIndex + 1,
          })),
      };
    });
  }

  function handleMoveStep(index, offset) {
    setDraft((currentDraft) => {
      const targetIndex = index + offset;

      if (targetIndex < 0 || targetIndex >= currentDraft.steps.length) {
        return currentDraft;
      }

      const steps = [...currentDraft.steps];

      [steps[index], steps[targetIndex]] = [
        steps[targetIndex],
        steps[index],
      ];

      return {
        ...currentDraft,
        steps: steps.map((step, stepIndex) => ({
          ...step,
          order: stepIndex + 1,
        })),
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!draft.title.trim()) {
      setTitleError("음식 이름을 입력해주세요.");
      titleInputRef.current?.focus();
      return;
    }

    setTitleError("");
    const cookingTime = draft.cookingTimeMinutes;
    const isInvalidCookingTime =
      cookingTime !== "" &&
      (!Number.isInteger(Number(cookingTime)) || Number(cookingTime) < 0);

    if (isInvalidCookingTime) {
      setCookingTimeError("조리 시간은 0 이상의 정수로 입력해주세요.");
      cookingTimeInputRef.current?.focus();
      return;
    }

    setCookingTimeError("");

    const nextIngredientNameErrors = draft.ingredients.map((ingredient) =>
      ingredient.name.trim() ? "" : "재료 이름을 입력해주세요.",
    );
    const nextStepErrors = draft.steps.map((step) =>
      step.description.trim() ? "" : "조리 단계 내용을 입력해주세요.",
    );

    setIngredientNameErrors(nextIngredientNameErrors);
    setStepErrors(nextStepErrors);

    const firstIngredientErrorIndex =
      nextIngredientNameErrors.findIndex(Boolean);
    const firstStepErrorIndex = nextStepErrors.findIndex(Boolean);

    if (firstIngredientErrorIndex >= 0) {
      ingredientNameInputRefs.current[firstIngredientErrorIndex]?.focus();
      return;
    }
    if (firstStepErrorIndex >= 0) {
      stepInputRefs.current[firstStepErrorIndex]?.focus();
      return;
    }

    const sourceUrl = normalizeOptionalText(draft.source?.url);
    const source = isSourceEditable
      ? sourceUrl
        ? {
            url: sourceUrl,
            title: normalizeOptionalText(draft.source?.title),
            author: normalizeOptionalText(draft.source?.author),
          }
        : null
      : draft.source;

    onSubmit({
      ...draft,
      title: draft.title.trim(),
      description: normalizeOptionalText(draft.description),
      servings: normalizeOptionalText(draft.servings),
      cookingTimeMinutes:
        cookingTime === "" ? null : Number(cookingTime),
      ingredients: draft.ingredients.map((ingredient, index) => ({
        ...ingredient,
        name: ingredient.name.trim(),
        amount: normalizeOptionalText(ingredient.amount),
        unit: normalizeOptionalText(ingredient.unit),
        order: index + 1,
      })),
      steps: draft.steps.map((step, index) => ({
        ...step,
        description: step.description.trim(),
        order: index + 1,
      })),
      source,
    });
  }

  return (
    <form
      className="mt-8"
      noValidate
      aria-busy={isSubmitting}
      onSubmit={handleSubmit}
    >
      <label className={labelClassName}>
        음식 이름
        <input
          className={fieldClassName}
          aria-describedby={getDescribedBy(
            titleError ? "title-error" : null,
            titleWarning?.id,
          )}
          aria-invalid={Boolean(titleError)}
          name="title"
          value={draft.title}
          ref={titleInputRef}
          onChange={handleChange}
        />
      </label>
      {titleError ? (
        <p className={errorClassName} id="title-error">{titleError}</p>
      ) : null}
      {titleWarning ? (
        <p className={warningClassName} id={titleWarning.id}>
          {titleWarning.message}
        </p>
      ) : null}

      <label className={`${labelClassName} mt-5`}>
        레시피 설명
        <textarea
          className={`${fieldClassName} min-h-28 resize-y leading-6`}
          name="description"
          value={draft.description}
          aria-describedby={descriptionWarning?.id}
          onChange={handleChange}
        />
      </label>
      {descriptionWarning ? (
        <p className={warningClassName} id={descriptionWarning.id}>
          {descriptionWarning.message}
        </p>
      ) : null}

      <label className={`${labelClassName} mt-5`}>
        기준 인원
        <input
          className={fieldClassName}
          name="servings"
          value={draft.servings}
          aria-describedby={servingsWarning?.id}
          onChange={handleChange}
        />
      </label>
      {servingsWarning ? (
        <p className={warningClassName} id={servingsWarning.id}>
          {servingsWarning.message}
        </p>
      ) : null}

      <label className={`${labelClassName} mt-5`}>
        예상 조리 시간
        <input
          className={fieldClassName}
          name="cookingTimeMinutes"
          type="number"
          min="0"
          step="1"
          value={draft.cookingTimeMinutes}
          aria-describedby={getDescribedBy(
            cookingTimeError ? "cooking-time-error" : null,
            cookingTimeWarning?.id,
          )}
          aria-invalid={Boolean(cookingTimeError)}
          ref={cookingTimeInputRef}
          onChange={handleChange}
        />
      </label>
      {cookingTimeError ? (
        <p className={errorClassName} id="cooking-time-error">
          {cookingTimeError}
        </p>
      ) : null}
      {cookingTimeWarning ? (
        <p className={warningClassName} id={cookingTimeWarning.id}>
          {cookingTimeWarning.message}
        </p>
      ) : null}
      <fieldset className="mt-8 border-t border-[#d8cfbd] pt-6">
        <legend className="pr-3 text-lg font-semibold tracking-[0.02em] text-[#272923]">
          재료
        </legend>

        {draft.ingredients.map((ingredient, index) => {
          const nameWarning = getWarning(`ingredients[${index}].name`);
          const amountWarning = getWarning(`ingredients[${index}].amount`);
          const unitWarning = getWarning(`ingredients[${index}].unit`);

          return (
            <div
              className="mt-4 rounded-[10px] border border-[#d8cfbd] bg-[rgb(255_255_255_/_28%)] p-4"
              key={index}
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.7fr)]">
                <div className="min-w-0">
                  <label className={labelClassName}>
                    재료 {index + 1} 이름
                    <input
                      className={fieldClassName}
                      value={ingredient.name}
                      aria-describedby={getDescribedBy(
                        ingredientNameErrors[index]
                          ? `ingredient-${index}-name-error`
                          : null,
                        nameWarning?.id,
                      )}
                      aria-invalid={Boolean(ingredientNameErrors[index])}
                      ref={(element) => {
                        ingredientNameInputRefs.current[index] = element;
                      }}
                      onChange={(event) =>
                        handleIngredientChange(index, "name", event.target.value)
                      }
                    />
                  </label>

                  {ingredientNameErrors[index] ? (
                    <p
                      className={errorClassName}
                      id={`ingredient-${index}-name-error`}
                    >
                      {ingredientNameErrors[index]}
                    </p>
                  ) : null}
                  {nameWarning ? (
                    <p className={warningClassName} id={nameWarning.id}>
                      {nameWarning.message}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <label className={labelClassName}>
                    재료 {index + 1} 수량
                    <input
                      className={fieldClassName}
                      value={ingredient.amount ?? ""}
                      aria-describedby={amountWarning?.id}
                      onChange={(event) =>
                        handleIngredientChange(index, "amount", event.target.value)
                      }
                    />
                  </label>

                  {amountWarning ? (
                    <p className={warningClassName} id={amountWarning.id}>
                      {amountWarning.message}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <label className={labelClassName}>
                    재료 {index + 1} 단위
                    <input
                      className={fieldClassName}
                      value={ingredient.unit ?? ""}
                      aria-describedby={unitWarning?.id}
                      onChange={(event) =>
                        handleIngredientChange(index, "unit", event.target.value)
                      }
                    />
                  </label>
                  {unitWarning ? (
                    <p className={warningClassName} id={unitWarning.id}>
                      {unitWarning.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#ded5c3] pt-3">
                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveIngredient(index, -1)}
                >
                  재료 {index + 1} 위로 이동
                </button>

                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === draft.ingredients.length - 1}
                  onClick={() => handleMoveIngredient(index, 1)}
                >
                  재료 {index + 1} 아래로 이동
                </button>
                <button
                  className={deleteButtonClassName}
                  type="button"
                  disabled={draft.ingredients.length === 1}
                  onClick={() => handleRemoveIngredient(index)}
                >
                  재료 {index + 1} 삭제
                </button>
              </div>
            </div>
          );
        })}
        <button
          className={`${secondaryButtonClassName} mt-4 w-full sm:w-auto`}
          type="button"
          onClick={handleAddIngredient}
        >
          재료 추가
        </button>
      </fieldset>
      <fieldset className="mt-8 border-t border-[#d8cfbd] pt-6">
        <legend className="pr-3 text-lg font-semibold tracking-[0.02em] text-[#272923]">
          조리 단계
        </legend>

        {draft.steps.map((step, index) => {
          const stepWarning = getWarning(`steps[${index}].description`);

          return (
            <div
              className="mt-4 rounded-[10px] border border-[#d8cfbd] bg-[rgb(255_255_255_/_28%)] p-4"
              key={index}
            >
              <label className={labelClassName}>
                조리 단계 {index + 1} 내용
                <textarea
                  className={`${fieldClassName} min-h-28 resize-y leading-6`}
                  value={step.description}
                  aria-describedby={getDescribedBy(
                    stepErrors[index] ? `step-${index}-error` : null,
                    stepWarning?.id,
                  )}
                  aria-invalid={Boolean(stepErrors[index])}
                  ref={(element) => {
                    stepInputRefs.current[index] = element;
                  }}
                  onChange={(event) =>
                    handleStepChange(index, event.target.value)
                  }
                />
              </label>
              {stepErrors[index] ? (
                <p className={errorClassName} id={`step-${index}-error`}>
                  {stepErrors[index]}
                </p>
              ) : null}
              {stepWarning ? (
                <p className={warningClassName} id={stepWarning.id}>
                  {stepWarning.message}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#ded5c3] pt-3">
                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveStep(index, -1)}
                >
                  조리 단계 {index + 1} 위로 이동
                </button>

                <button
                  className={secondaryButtonClassName}
                  type="button"
                  disabled={index === draft.steps.length - 1}
                  onClick={() => handleMoveStep(index, 1)}
                >
                  조리 단계 {index + 1} 아래로 이동
                </button>
                <button
                  className={deleteButtonClassName}
                  type="button"
                  disabled={draft.steps.length === 1}
                  onClick={() => handleRemoveStep(index)}
                >
                  조리 단계 {index + 1} 삭제
                </button>
              </div>
            </div>
          );
        })}
        <button
          className={`${secondaryButtonClassName} mt-4 w-full sm:w-auto`}
          type="button"
          onClick={handleAddStep}
        >
          조리 단계 추가
        </button>
      </fieldset>
      {isSourceEditable ? (
        <fieldset className="mt-8 border-t border-[#d8cfbd] pt-6">
          <legend className="pr-3 text-lg font-semibold tracking-[0.02em] text-[#272923]">
            출처
          </legend>
          <p className="mt-2 text-xs leading-5 text-[#777368]">
            URL을 비우면 직접 작성한 레시피로 저장됩니다.
          </p>
          <label className={`${labelClassName} mt-4`}>
            출처 URL
            <input
              className={fieldClassName}
              name="sourceUrl"
              type="url"
              value={draft.source?.url ?? ""}
              onChange={(event) =>
                handleSourceChange("url", event.target.value)
              }
            />
          </label>
          <label className={`${labelClassName} mt-5`}>
            출처 제목
            <input
              className={fieldClassName}
              name="sourceTitle"
              value={draft.source?.title ?? ""}
              onChange={(event) =>
                handleSourceChange("title", event.target.value)
              }
            />
          </label>
          <label className={`${labelClassName} mt-5`}>
            출처 작성자 또는 채널명
            <input
              className={fieldClassName}
              name="sourceAuthor"
              value={draft.source?.author ?? ""}
              onChange={(event) =>
                handleSourceChange("author", event.target.value)
              }
            />
          </label>
        </fieldset>
      ) : draft.source ? (
        <aside
          className="mt-8 border-t border-[#d8cfbd] pt-6"
          aria-labelledby="recipe-source-heading"
        >
          <h2
            className="text-sm font-semibold text-[#626157]"
            id="recipe-source-heading"
          >
            출처
          </h2>
          <a
            className="mt-2 block break-all text-sm font-semibold leading-6 text-[#6e572a] underline decoration-[#bca56c] underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd78]"
            href={draft.source.url}
            target="_blank"
            rel="noreferrer"
          >
            {draft.source.title ?? draft.source.url}
          </a>
          {draft.source.author ? (
            <p className="mt-1 text-xs text-[#777368]">
              {draft.source.author}
            </p>
          ) : null}
        </aside>
      ) : null}
      {submitError ? (
        <p className={`${errorClassName} mt-8`} role="alert">
          {submitError}
        </p>
      ) : null}
      <div className={`${submitError ? "mt-4" : "mt-8"} grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 border-t border-[#d8cfbd] pt-5 sm:flex sm:justify-end`}>
        <button
          className="min-h-11 rounded-lg border border-[#b8aa8f] px-4 text-sm font-semibold text-[#55544d] transition-colors hover:bg-[#efe7d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd78] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          취소
        </button>
        <button
          className="min-h-11 rounded-lg border border-[#061c16] bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-[length:220px] px-5 text-sm font-semibold text-[#f3e1b4] shadow-sm transition-colors hover:bg-[#1d4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f5eb] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-32"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "저장 중…" : "저장하기"}
        </button>
      </div>
    </form>
  );
}

export default RecipeDraftForm;

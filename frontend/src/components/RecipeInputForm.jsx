import { useState } from "react";

function validateSourceUrl(sourceUrl) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(sourceUrl);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "http 또는 https 주소를 입력해주세요.";
    }
  } catch {
    return "올바른 URL을 입력해주세요.";
  }

  return "";
}

function RecipeInputForm({ isPrepared, onCancel, onPrepare }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceUrlError, setSourceUrlError] = useState("");
  const [inputError, setInputError] = useState("");

  function handleSourceUrlChange(event) {
    setSourceUrl(event.target.value);
    setSourceUrlError("");
    setInputError("");
    onPrepare(null);
  }

  function handleRawTextChange(event) {
    setRawText(event.target.value);
    setInputError("");
    onPrepare(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedSourceUrl = sourceUrl.trim();
    const normalizedRawText = rawText.trim();
    const nextSourceUrlError = validateSourceUrl(normalizedSourceUrl);

    setSourceUrlError(nextSourceUrlError);

    if (!normalizedSourceUrl && !normalizedRawText) {
      setInputError("URL 또는 레시피 내용을 하나 이상 입력해주세요.");
      return;
    }

    if (nextSourceUrlError) {
      return;
    }

    setInputError("");
    onPrepare({
      sourceUrl: normalizedSourceUrl || null,
      rawText: normalizedRawText || null,
    });
  }

  const fieldClassName =
    "mt-2 w-full rounded-[8px] border border-[#c9bea7] bg-[rgb(255_255_255_/_48%)] px-3.5 py-3 text-sm text-[#272923] outline-none placeholder:text-[#8b887e] focus-visible:border-[#8b6e35] focus-visible:ring-2 focus-visible:ring-[#d8bd78]";

  return (
    <form className="flex flex-col min-h-full" noValidate onSubmit={handleSubmit}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8b6e35]">새 레시피</p>
        <h1 className="mt-2 text-[29px] font-semibold tracking-[0.06em] text-[#272923] max-[700px]:text-[24px] short-screen:text-[25px]">레시피를 들려주세요</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#626157]">주소를 가져오거나 레시피를 직접 적어주세요. 두 가지를 모두 적으면 내용을 보완해 정리합니다.</p>
      </div>

      <div className="mt-7 grid gap-6 short-screen:mt-5 short-screen:gap-4">
        <div>
          <label className="text-sm font-semibold text-[#34362f]" htmlFor="recipe-source-url">
            레시피 URL <span className="font-normal text-[#777469]">(선택)</span>
          </label>
          <p className="mt-1 text-[11px] leading-5 text-[#777469]" id="recipe-source-url-help">
            유튜브, 블로그 등 웹페이지 주소를 입력하세요.
          </p>
          <input
            id="recipe-source-url"
            name="sourceUrl"
            type="url"
            value={sourceUrl}
            className={fieldClassName}
            placeholder="https://example.com/recipe"
            aria-describedby={`recipe-source-url-help${sourceUrlError ? " recipe-source-url-error" : ""}`}
            aria-invalid={Boolean(sourceUrlError)}
            onChange={handleSourceUrlChange}
          />
          {sourceUrlError ? (
            <p className="mt-2 text-xs text-[#8a3f2b]" id="recipe-source-url-error">{sourceUrlError}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-[#34362f]" htmlFor="recipe-raw-text">
            직접 입력 <span className="font-normal text-[#777469]">(선택)</span>
          </label>
          <p className="mt-1 text-[11px] leading-5 text-[#777469]" id="recipe-raw-text-help">
            재료와 조리법을 편한 문장으로 적거나 URL의 보완 내용을 남겨 주세요.
          </p>
          <textarea
            id="recipe-raw-text"
            name="rawText"
            value={rawText}
            className={`${fieldClassName} min-h-60 resize-y leading-6 short-screen:min-h-28`}
            placeholder="예: 김치를 돼지고기와 볶다가 물을 넣고 푹 끓여요. 간장은 조금만 넣어 주세요.(알러지 관련 부분도 넣으면 좋을듯)"
            aria-describedby={`recipe-raw-text-help${inputError ? " recipe-input-error" : ""}`}
            aria-invalid={Boolean(inputError)}
            onChange={handleRawTextChange}
          />
        </div>
      </div>

      {inputError ? (
        <p className="mt-3 rounded-md bg-[#f8e9e3] px-3 py-2 text-xs text-[#8a3f2b]" id="recipe-input-error" role="alert">
          {inputError}
        </p>
      ) : null}

      {isPrepared ? (
        <p className="mt-3 rounded-md border border-[#b8aa82] bg-[#f3ecda] px-3 py-2 text-xs leading-5 text-[#5d563f]" role="status">
          입력 내용을 확인했습니다. 다음 단계에서 레시피 정리로 이어집니다.
        </p>
      ) : null}

      <div className="mt-auto border-t border-[#d8cfbd] pt-5">
        <div className="mb-4 text-center text-xs text-[#6f6b60]">
          전달받은 레시피가 있나요?{" "}
          <span className="font-semibold text-[#5d4a25]">코드 입력은 별도 화면에서 진행합니다.</span>
        </div>
        <div className="flex justify-end gap-2.5 max-[700px]:grid max-[700px]:grid-cols-[auto_1fr]">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-[#b8aa8f] px-4 text-sm text-[#55544d]"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-[#061c16] bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-[length:220px] px-5 text-sm font-semibold text-[#f3e1b4]"
          >
            레시피 정리하기
          </button>
        </div>
      </div>
    </form>
  );
}

export default RecipeInputForm;
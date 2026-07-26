import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../auth/authContext";
import {
  acceptTransferInvitation,
  getTransferInvitationByCode,
  getTransferInvitationByLink,
} from "../api/transferInvitationApi";

const ERROR_MESSAGES = {
  TRANSFER_INVITATION_NOT_FOUND: "유효하지 않은 초대 코드입니다.",
  TRANSFER_INVITATION_USED: "이미 사용된 전달 초대입니다.",
  TRANSFER_INVITATION_EXPIRED: "만료된 전달 초대입니다.",
  TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED:
    "자신이 만든 전달 초대는 수락할 수 없습니다.",
  VALIDATION_ERROR: "입력값을 확인해 주세요.",
};

const ACCEPT_ERROR_MESSAGES = {
  ...ERROR_MESSAGES,
  TRANSFER_INVITATION_NOT_FOUND: "유효하지 않은 전달 초대입니다.",
};

function getErrorMessage(error, isLinkInvitation) {
  if (
    isLinkInvitation &&
    error?.code === "TRANSFER_INVITATION_NOT_FOUND"
  ) {
    return "유효하지 않은 전달 링크입니다.";
  }

  return (
    ERROR_MESSAGES[error?.code] ??
    "전달 초대를 확인하지 못했습니다. 다시 시도해 주세요."
  );
}

function RecipePreview({ preview, onAccept, onReject }) {
  const { recipe } = preview;

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.08em] text-[#8b6e35]">
        {preview.originalOwner.name}님이 전달한 레시피
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[0.04em] text-[#272923]">
        {recipe.title}
      </h1>

      {recipe.description ? (
        <p className="mt-3 text-sm leading-6 text-[#626157]">
          {recipe.description}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[#d8cfbd] py-4 text-sm">
        <div>
          <dt className="text-xs text-[#777469]">분량</dt>
          <dd className="mt-1 font-semibold text-[#272923]">
            {recipe.servings ?? "미정"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#777469]">조리 시간</dt>
          <dd className="mt-1 font-semibold text-[#272923]">
            {recipe.cookingTimeMinutes === null
              ? "미정"
              : `${recipe.cookingTimeMinutes}분`}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="transfer-ingredients-heading">
          <h2
            id="transfer-ingredients-heading"
            className="text-base font-semibold text-[#272923]"
          >
            재료
          </h2>
          {recipe.ingredients.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-[#34362f]">
              {recipe.ingredients.map((ingredient) => (
                <li
                  key={`${ingredient.order}-${ingredient.name}`}
                  className="flex justify-between gap-3 border-b border-dotted border-[#d8cfbd] pb-2"
                >
                  <span>{ingredient.name}</span>
                  <span className="text-[#626157]">
                    {[ingredient.amount, ingredient.unit]
                      .filter(Boolean)
                      .join(" ") || "적당량"}
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

        <section aria-labelledby="transfer-steps-heading">
          <h2
            id="transfer-steps-heading"
            className="text-base font-semibold text-[#272923]"
          >
            조리 순서
          </h2>
          {recipe.steps.length > 0 ? (
            <ol className="mt-3 space-y-3 text-sm leading-6 text-[#34362f]">
              {recipe.steps.map((step) => (
                <li
                  key={step.order}
                  className="grid grid-cols-[24px_minmax(0,1fr)] gap-2"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#15332a] text-xs text-[#f3e1b4]"
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
      </div>

      {recipe.source ? (
        <section className="mt-6 border-t border-[#d8cfbd] pt-4">
          <h2 className="text-sm font-semibold text-[#272923]">출처</h2>
          <a
            href={recipe.source.url}
            className="mt-2 inline-block break-all text-sm text-[#31523d] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a]"
          >
            {recipe.source.title ?? recipe.source.url}
          </a>
        </section>
      ) : null}

      {!preview.canReshare ? (
        <p className="mt-6 rounded-lg border border-[#d8cfbd] bg-[#f1ecdf] px-4 py-3 text-xs leading-5 text-[#626157]">
          전달받은 레시피는 다시 공유할 수 없습니다.
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-12 flex-1 rounded-lg border border-[#31523d] bg-[#15332a] px-4 font-semibold text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35]"
        >
          수락
        </button>
        <button
          type="button"
          onClick={onReject}
          className="min-h-12 flex-1 rounded-lg border border-[#31523d] bg-[#15332a] px-4 font-semibold text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35]"
        >
          거절
        </button>
      </div>
    </div>
  );
}

function RelationshipForm({
  senderDisplayName,
  relationshipLabel,
  memo,
  fieldErrors,
  errorMessage,
  isSaving,
  onSenderDisplayNameChange,
  onRelationshipLabelChange,
  onMemoChange,
  onCancel,
  onSubmit,
}) {
  return (
    <form noValidate aria-busy={isSaving} onSubmit={onSubmit}>
      <header className="border-b border-[#d8cfbd] pb-4">
        <p className="text-xs font-semibold tracking-[0.08em] text-[#8b6e35]">
          전달받은 기억
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#272923]">
          누구에게 받은 레시피인가요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#626157]">
          나중에 기억하기 쉽도록 전해준 사람과 관계를 남겨 주세요.
        </p>
      </header>

      <label
        htmlFor="sender-display-name"
        className="mt-5 block text-sm font-semibold text-[#272923]"
      >
        전해준 사람
      </label>
      <input
        id="sender-display-name"
        value={senderDisplayName}
        disabled={isSaving}
        aria-invalid={Boolean(fieldErrors.senderDisplayName)}
        aria-describedby={
          fieldErrors.senderDisplayName ? "sender-display-name-error" : undefined
        }
        onChange={(event) => onSenderDisplayNameChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-[#8d806b] bg-white px-3.5 text-base text-[#272923] outline-none focus-visible:border-[#31523d] focus-visible:ring-2 focus-visible:ring-[#aa8c4b]"
      />
      {fieldErrors.senderDisplayName ? (
        <p
          id="sender-display-name-error"
          className="mt-2 text-sm font-semibold text-[#8a3f2b]"
        >
          {fieldErrors.senderDisplayName}
        </p>
      ) : null}

      <label
        htmlFor="relationship-label"
        className="mt-5 block text-sm font-semibold text-[#272923]"
      >
        관계 라벨
      </label>
      <input
        id="relationship-label"
        value={relationshipLabel}
        disabled={isSaving}
        aria-invalid={Boolean(fieldErrors.relationshipLabel)}
        aria-describedby={
          fieldErrors.relationshipLabel ? "relationship-label-error" : undefined
        }
        onChange={(event) => onRelationshipLabelChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-[#8d806b] bg-white px-3.5 text-base text-[#272923] outline-none focus-visible:border-[#31523d] focus-visible:ring-2 focus-visible:ring-[#aa8c4b]"
      />
      {fieldErrors.relationshipLabel ? (
        <p
          id="relationship-label-error"
          className="mt-2 text-sm font-semibold text-[#8a3f2b]"
        >
          {fieldErrors.relationshipLabel}
        </p>
      ) : null}

      <label
        htmlFor="transfer-memo"
        className="mt-5 block text-sm font-semibold text-[#272923]"
      >
        내 메모 (선택)
      </label>
      <textarea
        id="transfer-memo"
        value={memo}
        disabled={isSaving}
        rows={3}
        onChange={(event) => onMemoChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[#8d806b] bg-white px-3.5 py-3 text-base text-[#272923] outline-none focus-visible:border-[#31523d] focus-visible:ring-2 focus-visible:ring-[#aa8c4b]"
      />

      {errorMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[#c98c76] bg-[#fff4ef] px-4 py-3 text-sm font-semibold text-[#8a3f2b]"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="min-h-12 flex-1 rounded-lg border border-[#8d806b] bg-[#f8f5eb] px-4 font-semibold text-[#34362f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35] disabled:opacity-70"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="min-h-12 flex-1 rounded-lg border border-[#061c16] bg-[#15332a] px-4 font-semibold text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35] disabled:cursor-wait disabled:opacity-70"
        >
          {isSaving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

function TransferInvitationPage({ isDialog = false }) {
  const { linkToken } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationCode, setInvitationCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(linkToken));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!linkToken) {
      return;
    }

    let isActive = true;

    async function loadPreview() {
      try {
        const idToken = await user.getIdToken();
        const result = await getTransferInvitationByLink(idToken, linkToken);

        if (isActive) {
          setPreview(result);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error, true));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isActive = false;
    };
  }, [linkToken, user]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const normalizedCode = invitationCode.trim();

    if (!normalizedCode) {
      setErrorMessage("초대 코드를 입력해 주세요.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const idToken = await user.getIdToken();
      const result = await getTransferInvitationByCode(
        idToken,
        normalizedCode,
      );
      setPreview(result);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, false));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleStartAccept() {
    setErrorMessage("");
    setFieldErrors({});
    setIsAccepting(true);
  }

  function handleCancelAccept() {
    setErrorMessage("");
    setFieldErrors({});
    setIsAccepting(false);
  }

  async function handleAccept(event) {
    event.preventDefault();

    if (isSavingRef.current) {
      return;
    }

    const normalizedSenderDisplayName = senderDisplayName.trim();
    const normalizedRelationshipLabel = relationshipLabel.trim();
    const nextFieldErrors = {};

    if (!normalizedSenderDisplayName) {
      nextFieldErrors.senderDisplayName =
        "전해준 사람을 입력해 주세요.";
    }

    if (!normalizedRelationshipLabel) {
      nextFieldErrors.relationshipLabel =
        "관계 라벨을 입력해 주세요.";
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage("");

    try {
      const idToken = await user.getIdToken();
      const result = await acceptTransferInvitation(
        idToken,
        preview.invitationId,
        {
          senderDisplayName: normalizedSenderDisplayName,
          relationshipLabel: normalizedRelationshipLabel,
          memo: memo.trim() || null,
        },
      );

      navigate(`/recipes/${result.recipeId}`, {
        replace: true,
        state: { receivedRecipeSaved: true },
      });
    } catch (error) {
      setErrorMessage(
        ACCEPT_ERROR_MESSAGES[error?.code] ??
          "레시피를 저장하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  let content;

  if (isLoading) {
    content = (
      <div className="grid min-h-56 place-items-center">
        <p role="status" className="text-sm text-[#626157]">
          전달받은 레시피를 불러오는 중입니다.
        </p>
      </div>
    );
  } else if (preview && isAccepting) {
    content = (
      <RelationshipForm
        senderDisplayName={senderDisplayName}
        relationshipLabel={relationshipLabel}
        memo={memo}
        fieldErrors={fieldErrors}
        errorMessage={errorMessage}
        isSaving={isSaving}
        onSenderDisplayNameChange={setSenderDisplayName}
        onRelationshipLabelChange={setRelationshipLabel}
        onMemoChange={setMemo}
        onCancel={handleCancelAccept}
        onSubmit={handleAccept}
      />
    );
  } else if (preview) {
    content = (
      <RecipePreview
        preview={preview}
        onAccept={handleStartAccept}
        onReject={() => navigate("/recipes")}
      />
    );
  } else if (linkToken) {
    content = (
      <div className="grid min-h-56 place-items-center text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#272923]">
            전달 초대를 확인할 수 없습니다
          </h1>
          <p role="alert" className="mt-3 text-sm text-[#8a3f2b]">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate("/recipes")}
            className="mt-6 min-h-11 rounded-lg border border-[#31523d] bg-[#15332a] px-5 font-semibold text-[#f3e1b4]"
          >
            레시피북으로 돌아가기
          </button>
        </div>
      </div>
    );
  } else {
    const describedBy = errorMessage
      ? "transfer-code-help transfer-code-error"
      : "transfer-code-help";

    content = (
      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit}
      >
        {!isDialog ? (
          <header>
            <p className="text-xs font-semibold tracking-[0.12em] text-[#8b6e35]">
              전달받은 레시피
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#272923]">
              전달 코드로 레시피 받기
            </h1>
          </header>
        ) : null}
        <p
          id="transfer-code-help"
          className={`${isDialog ? "" : "mt-3"} text-sm leading-6 text-[#626157]`}
        >
          전달받은 코드를 입력하면 저장하기 전에 레시피 내용을 확인할 수
          있습니다.
        </p>
        <label
          htmlFor="invitation-code"
          className="mt-6 block text-sm font-semibold text-[#272923]"
        >
          전달 코드
        </label>
        <input
          id="invitation-code"
          value={invitationCode}
          autoFocus={isDialog}
          autoComplete="off"
          disabled={isSubmitting}
          aria-describedby={describedBy}
          aria-invalid={Boolean(errorMessage)}
          onChange={(event) => setInvitationCode(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-lg border border-[#8d806b] bg-white px-3.5 text-base text-[#272923] outline-none focus-visible:border-[#31523d] focus-visible:ring-2 focus-visible:ring-[#aa8c4b]"
        />
        {errorMessage ? (
          <p
            id="transfer-code-error"
            role="alert"
            className="mt-2 text-sm font-semibold text-[#8a3f2b]"
          >
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 min-h-12 w-full rounded-lg border border-[#061c16] bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[220px] px-4 font-semibold text-[#f3e1b4] shadow-[0_5px_14px_rgb(38_32_22/18%)] hover:bg-[#102b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35] disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting ? "코드 확인 중…" : "코드 확인"}
        </button>
      </form>
    );
  }

  if (isDialog) {
    return content;
  }

  return (
    <main className="min-h-dvh bg-[#17241f] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[340px] px-4 py-8 font-[Noto_Serif_KR,Nanum_Myeongjo,Malgun_Gothic,serif] sm:py-14">
      <section className="mx-auto max-w-3xl rounded-[5px] border border-[#d8cfbd] bg-[#f8f5eb] p-5 shadow-[0_22px_70px_rgb(4_16_12/42%)] sm:p-8">
        {content}
      </section>
    </main>
  );
}

export default TransferInvitationPage;

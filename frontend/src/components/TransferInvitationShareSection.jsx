import { useRef, useState } from "react";
import { createTransferInvitation } from "../api/transferInvitationApi";

function TransferInvitationShareSection({ recipeId, user }) {
  const [transferInvitation, setTransferInvitation] = useState(null);
  const [isCreatingTransferInvitation, setIsCreatingTransferInvitation] =
    useState(false);
  const [transferInvitationError, setTransferInvitationError] =
    useState("");
  const [copyFeedback, setCopyFeedback] = useState(null);
  const isCreatingTransferInvitationRef = useRef(false);

  async function handleCreateTransferInvitation() {
    if (isCreatingTransferInvitationRef.current) {
      return;
    }

    isCreatingTransferInvitationRef.current = true;
    setIsCreatingTransferInvitation(true);
    setTransferInvitationError("");
    setCopyFeedback(null);

    try {
      if (!user || !recipeId) {
        throw new Error("로그인 정보를 확인할 수 없습니다.");
      }

      const idToken = await user.getIdToken();
      const invitation = await createTransferInvitation(
        idToken,
        recipeId,
      );

      setTransferInvitation(invitation);
    } catch (requestError) {
      setTransferInvitationError(
        requestError instanceof Error
          ? requestError.message
          : "전달 초대를 만들지 못했습니다.",
      );
    } finally {
      isCreatingTransferInvitationRef.current = false;
      setIsCreatingTransferInvitation(false);
    }
  }

  async function handleCopyTransferValue(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback({
        isError: false,
        message: `${label}를 복사했습니다.`,
      });
    } catch {
      setCopyFeedback({
        isError: true,
        message: `${label}를 복사하지 못했습니다.`,
      });
    }
  }

  const transferLink = transferInvitation
    ? `${window.location.origin}${transferInvitation.transferPath}`
    : "";

  return (
    <section
      className="mt-6 rounded-lg border border-[#c9bea7] bg-[#f1ecdf] p-4"
      aria-labelledby="transfer-invitation-heading"
    >
      <h3
        id="transfer-invitation-heading"
        className="text-lg font-semibold"
      >
        전달 공유
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#626157]">
        한 명이 자신의 레시피북에 저장할 수 있는 일회성 초대를
        만듭니다.
      </p>
      <button
        type="button"
        className="mt-4 min-h-11 rounded-lg border border-[#061c16] bg-[#15332a] px-4 text-sm font-semibold text-[#f3e1b4] disabled:cursor-wait disabled:opacity-70"
        disabled={isCreatingTransferInvitation}
        aria-busy={isCreatingTransferInvitation}
        onClick={handleCreateTransferInvitation}
      >
        {isCreatingTransferInvitation ? "생성 중" : "전달 초대 만들기"}
      </button>

      {transferInvitationError ? (
        <p role="alert" className="mt-3 text-sm text-[#8a3f2b]">
          {transferInvitationError}
        </p>
      ) : null}

      {transferInvitation ? (
        <div className="mt-5 border-t border-[#d8cfbd] pt-4">
          <div>
            <label
              className="text-sm font-semibold"
              htmlFor="transfer-invitation-link"
            >
              전달 링크
            </label>
            <div className="mt-2 flex gap-2 max-[700px]:grid">
              <input
                id="transfer-invitation-link"
                className="min-h-11 min-w-0 flex-1 rounded-md border border-[#b8ad97] bg-[#fbf8ef] px-3 text-sm"
                value={transferLink}
                readOnly
              />
              <button
                type="button"
                className="min-h-11 rounded-md border border-[#8b6e35] px-3 text-sm font-semibold text-[#31523d]"
                onClick={() =>
                  handleCopyTransferValue(transferLink, "전달 링크")
                }
              >
                전달 링크 복사
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label
              className="text-sm font-semibold"
              htmlFor="transfer-invitation-code"
            >
              초대 코드
            </label>
            <div className="mt-2 flex gap-2 max-[700px]:grid">
              <input
                id="transfer-invitation-code"
                className="min-h-11 min-w-0 flex-1 rounded-md border border-[#b8ad97] bg-[#fbf8ef] px-3 text-sm tracking-[0.08em]"
                value={transferInvitation.invitationCode}
                readOnly
              />
              <button
                type="button"
                className="min-h-11 rounded-md border border-[#8b6e35] px-3 text-sm font-semibold text-[#31523d]"
                onClick={() =>
                  handleCopyTransferValue(
                    transferInvitation.invitationCode,
                    "초대 코드",
                  )
                }
              >
                초대 코드 복사
              </button>
            </div>
          </div>

          {copyFeedback ? (
            <p
              role={copyFeedback.isError ? "alert" : "status"}
              className={`mt-3 text-sm ${
                copyFeedback.isError
                  ? "text-[#8a3f2b]"
                  : "text-[#31523d]"
              }`}
            >
              {copyFeedback.message}
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-[#777469]">
            링크와 코드는 같은 초대입니다. 한 명이 수락하면 다시
            사용할 수 없고 7일 후 만료됩니다. 원문 링크와 코드는 이
            생성 응답에서만 확인할 수 있습니다.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default TransferInvitationShareSection;

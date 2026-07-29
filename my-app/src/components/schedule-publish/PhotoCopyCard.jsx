import { useState } from "react";
import Card from "../Card";
import { copyImageToClipboard } from "../../lib/naverPublish";

const LABEL = { idle: "사진 복사", copying: "복사 중...", copied: "복사됨", failed: "실패, 다시 시도" };

function PhotoCopyCard({ photoFile }) {
  const [status, setStatus] = useState("idle");

  if (!photoFile) return null;

  const handleCopy = async () => {
    setStatus("copying");
    try {
      await copyImageToClipboard(photoFile);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <Card className="flex items-center justify-between gap-md border-primary/20">
      <div className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">image</span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          업로드한 사진은 따로 복사해야 해요. 본문을 붙여넣은 뒤, 사진을 넣고 싶은 자리에서 이 버튼을 누르고 다시 붙여넣기(Ctrl+V)해주세요.
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={status === "copying"}
        className="px-lg h-11 rounded-lg border border-primary text-primary font-label-md text-label-md hover:bg-primary/10 transition-all whitespace-nowrap flex-shrink-0 disabled:opacity-40"
      >
        {LABEL[status]}
      </button>
    </Card>
  );
}

export default PhotoCopyCard;

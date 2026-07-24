import { useState } from "react";

function FinancialSyncButton({ stockCode, onSyncComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    if (!stockCode) {
      setMessage("먼저 종목을 선택해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const response = await fetch(
        `http://localhost:3001/api/financial/sync/${stockCode}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "재무제표 동기화에 실패했습니다.");
      }

      setMessage("재무제표 동기화가 완료되었습니다.");

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error("재무제표 동기화 오류:", error);
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="financial-sync">
      <button
        type="button"
        onClick={handleSync}
        disabled={isLoading || !stockCode}
      >
        {isLoading ? "재무제표 불러오는 중..." : "재무제표 업데이트"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default FinancialSyncButton;
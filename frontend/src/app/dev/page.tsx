"use client";

import { useState } from "react";
import { login, recalculate, listPositions } from "@/lib/api";
import type { Position } from "@/lib/types";

/**
 * 백엔드 연동 확인용 임시 페이지 (/dev).
 * 기존 목업 화면은 건드리지 않고, 여기서만 실제 API(lib/api.ts)를 호출한다.
 *
 * 흐름: 로그인(김서준) → 적합도 재계산 → 적합도순 목록.
 * 하나라도 되면 CORS·인증·매칭·JSON 계약이 통한다는 뜻.
 *
 * 확인 끝나면 이 파일(src/app/dev/)은 지워도 된다.
 */
export default function DevIntegrationPage() {
  const [log, setLog] = useState<string[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [busy, setBusy] = useState(false);

  const add = (line: string) => setLog((prev) => [...prev, line]);

  async function run() {
    setBusy(true);
    setLog([]);
    setPositions([]);
    try {
      add("① 로그인 요청 → POST /api/auth/login (seojun@hub.dev)");
      const auth = await login("seojun@hub.dev", "test1234");
      add(`   ✓ 토큰 수신 (userId=${auth.userId})`);

      add("② 적합도 재계산 → POST /api/positions/recalculate");
      await recalculate();
      add("   ✓ 계산 완료");

      add("③ 적합도순 목록 → GET /api/positions");
      const list = await listPositions();
      add(`   ✓ ${list.length}건 수신`);
      setPositions(list);
    } catch (e) {
      add(`✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
      add("   → 백엔드가 8080에 떠 있는지, CORS(localhost:3000 허용)인지 확인");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>백엔드 연동 확인</h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        실제 API로 로그인 → 매칭 계산 → 적합도순 목록을 가져옵니다.
      </p>

      <button
        onClick={run}
        disabled={busy}
        style={{
          padding: "10px 18px",
          borderRadius: 8,
          border: "none",
          background: busy ? "#999" : "#0d9488",
          color: "white",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "실행 중…" : "연동 테스트 실행"}
      </button>

      {log.length > 0 && (
        <pre
          style={{
            marginTop: 20,
            padding: 16,
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {log.join("\n")}
        </pre>
      )}

      {positions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            적합도순 결과 (백엔드에서 계산된 실제 점수)
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>회사</th>
                <th style={{ padding: 8 }}>포지션</th>
                <th style={{ padding: 8, textAlign: "right" }}>적합도</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8, color: "#94a3b8" }}>{i + 1}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{p.company}</td>
                  <td style={{ padding: 8 }}>{p.title}</td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "right",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color:
                        p.fitScore >= 85 ? "#0d9488" : p.fitScore >= 60 ? "#2563eb" : p.fitScore >= 40 ? "#d97706" : "#dc2626",
                    }}
                  >
                    {p.fitScore}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

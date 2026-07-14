import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "적합도 — 이력 기반 AI 채용 매칭",
  description: "이력을 넣으면 맞는 자리부터 보여드립니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

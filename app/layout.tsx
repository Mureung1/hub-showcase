import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "later.",
  description: "링크나 텍스트를 저장하면 자동으로 분류해주는 앱",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#E8935A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

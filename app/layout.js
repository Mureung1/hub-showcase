import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

// 제목용 세리프 폰트. 한글이 필요하니 subsets에 "korean"을 지정한다.
const gowunBatang = Gowun_Batang({
  weight: "400",
  subsets: ["korean"],
  variable: "--font-title",
  display: "swap",
});

// 본문용 폰트. 300(가늘게)/400/500 세 굵기를 쓴다.
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  weight: ["300", "400", "500"],
  subsets: ["korean"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "콕",
  description: "할 일을 작은 단계로 나누고, 지금 할 일 하나에만 집중하도록 돕는 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${gowunBatang.variable} ${ibmPlexSansKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}

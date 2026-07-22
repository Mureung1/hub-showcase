import "./globals.css";

// 폰트는 next/font/google(빌드 시점에 구글 폰트 서버 접속 필요) 대신
// design.md에 문서화된 방식대로 <link> 태그로 로드한다.
// 브라우저가 실제로 접속할 때만 폰트를 받아오므로, npm run build/verify는
// 네트워크 연결 없이도 항상 재현 가능하다.
export const metadata = {
  title: "콕",
  description: "할 일을 작은 단계로 나누고, 지금 할 일 하나에만 집중하도록 돕는 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang&family=IBM+Plex+Sans+KR:wght@300;400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

# 프로젝트 기획

자취생이 냉장고 재료와 유통기한을 관리하고, 보유 재료를 활용한 식단과 구매 항목을 추천받는 웹 서비스입니다.

## 개발 시작

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

- 웹: `http://localhost:5173/`
- API 상태: `http://localhost:3000/api/health`

상세 환경과 협업 규칙은 `docs/DEVELOPMENT_GUIDE.md`, Agent 규칙은 `Agent.md`, UI 기준은 `design.md` 참고.

## 기획서 WIKI
[[기획서WIKI링크](https://github.com/pkchanghyun-pixel/hub/wiki/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B8%B0%ED%9A%8D%EC%84%9C-%5B%EC%9E%90%EC%B7%A8%EC%83%9D-%EC%9A%94%EB%A6%AC-%EC%B6%94%EC%B2%9C-%EC%9B%B9%ED%8E%98%EC%9D%B4%EC%A7%80-%EC%84%9C%EB%B9%84%EC%8A%A4%5D)]

## 주간계획 수립
[[Github Issue 참고](https://github.com/pkchanghyun-pixel/hub/issues)]

## 데이터 흐름 아키텍쳐 시각화
<img width="1919" height="729" alt="image" src="https://github.com/user-attachments/assets/88d3952d-4bd4-4c43-b2a4-cb20f983f75f" />

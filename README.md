# IRIS

> 필요한 대학 공지를 Discord에서 더 편하게



## 프로젝트 소개

**IRIS**는 대학교 공지사항을 Discord 알림으로 받아 필요한 정보를 놓치지 않게 도와주는 서비스입니다.
프로젝트 이름인 IRIS는 전령의 의미를 가지고 있으며, 직관적이고 부르기 쉬운 이름이라 선택했습니다.
- 관리자는 관리자 페이지에서 공지 사이트를 등록하고, 공통 알림 채널과 카테고리별 역할을 설정할 수 있습니다.
- 사용자는 원하는 공지 카테고리를 구독하거나 키워드를 등록하여 필요한 공지만 Discord에서 받아볼 수 있습니다.



## 주요 기능

- 실시간 공지 알림 : 새로운 공지가 올라오면 Discord에서 바로 알림을 받습니다.
- 카테고리 역할 알림 : 공통 알림 채널에서 카테고리별 역할 멘션으로 알림을 받습니다.
- 키워드 알림 : 관심 키워드가 포함된 제목의 공지를 개인 DM으로 받습니다.
- ('/') 슬래시 명령어 : Discord에서 간편하게 키워드와 카테고리 구독을 관리합니다.

## 로컬 실행

Node.js와 npm을 설치한 뒤, 처음 한 번은 각 프로젝트의 의존성과 환경 변수 파일을 준비합니다.

```powershell
cd frontend
npm install
Copy-Item .env.example .env

cd ../backend
npm install
Copy-Item .env.example .env
```

Backend와 Frontend는 각각 별도의 터미널에서 실행합니다.

### Backend

```powershell
cd backend
npm run dev
```

Backend는 `http://localhost:3000`에서 실행됩니다.

### Frontend

```powershell
cd frontend
npm run dev
```

Frontend는 `http://localhost:5173`에서 실행됩니다.



## 문서

프로젝트 기획 및 상세 문서는 아래 링크에서 확인할 수 있습니다.

- GitHub Wiki : **[IRIS 기획서](https://github.com/codeHyeon/hub/wiki/IRIS-%EA%B8%B0%ED%9A%8D%EC%84%9C)**

- Notion : **[IRIS 문서](https://app.notion.com/p/IRIS-beb020cdef3e82dba426015fa9eb15c2)**

- Local Docs
  - [개발 기준](./docs/DEVELOPMENT.md)
  - [Git/GitHub 작업 기준](./docs/CONTRIBUTING.md)
  - [QA 및 데모 체크리스트](./docs/QA.md)
  - [운영 배포](./docs/DEPLOYMENT.md)

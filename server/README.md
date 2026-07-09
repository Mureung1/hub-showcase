# Server 디렉토리

이 디렉토리는 서비스의 백엔드(서버) 소스 코드가 포함된 공간입니다.

## 역할 및 기능
- **Express & Node.js**: REST API 서버 구축을 위해 Node.js 환경에서 Express 프레임워크를 사용합니다.
- **TypeScript**: 안정성 높은 서버 구현을 위해 TypeScript가 적용되어 있습니다.
- **프로젝트 구성**:
  - `src/`: 실제 백엔드 비즈니스 로직 및 API 엔드포인트 코드가 위치하는 디렉토리입니다.
  - `tsconfig.json`: TypeScript 설정 파일입니다.
  - `package.json`: 서버에서 필요한 라이브러리(Express 등)와 스크립트가 정의되어 있습니다.
  - `.env`: 환경 변수 설정 파일입니다.

## 실행 및 빌드 방법
- 의존성 설치: `npm install`
- 개발 서버 실행: `npm run dev` 또는 `npm start`

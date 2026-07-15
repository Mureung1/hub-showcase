# CalMe 2주차 발표 자료

## 📊 발표 개요
- **발표 시간**: 약 10분
- **발표 대상**: 멘토, 팀원
- **발표 목표**: 2주차 구현 내용 및 기술 설계 설명

---

## 📑 슬라이드 구성 목차

### 1️⃣ Slide 1: 제목 슬라이드
### 2️⃣ Slide 2: 1주차 회고 및 2주차 목표
### 3️⃣ Slide 3: 2주차 구현 내용 개요
### 4️⃣ Slide 4: 기술 아키텍처 (React ↔ Express ↔ SQLite)
### 5️⃣ Slide 5: 로그인/회원가입 시스템 (JWT 기반)
### 6️⃣ Slide 6: 입력 방식 설계 (탭 구조)
### 7️⃣ Slide 7: 텍스트 입력 흐름
### 8️⃣ Slide 8: PDF 업로드 & 텍스트 추출 (핵심)
### 9️⃣ Slide 9: Mock AI 분석 결과 표시
### 🔟 Slide 10: 시연 계획 (회원가입 → 로그인 → 입력 → 분석)
### 1️⃣1️⃣ Slide 11: 기술 설계 이유 - 아키텍처 선택
### 1️⃣2️⃣ Slide 12: 기술 설계 이유 - 인증 방식 & 데이터베이스
### 1️⃣3️⃣ Slide 13: 기술 설계 이유 - PDF 처리 & Mock 데이터
### 1️⃣4️⃣ Slide 14: 어려웠던 점 & 해결 과정
### 1️⃣5️⃣ Slide 15: 3주차 계획
### 1️⃣6️⃣ Slide 16: 마무리

---

# 🎯 각 슬라이드 상세 구성

---

## Slide 1: 제목 슬라이드

### 📌 슬라이드 내용

```
┌─────────────────────────────────────┐
│                                     │
│     CalMe 2주차 발표                │
│                                     │
│  AI 기반 대학생 일정 관리 서비스    │
│                                     │
│     기반 구축 & 입력 기능 완성      │
│                                     │
│     2026.07.18 (금)                 │
│                                     │
└─────────────────────────────────────┘
```

### 🗣️ 발표자 멘트
(자연스러운 인사 후 시작)

---

## Slide 2: 1주차 회고 및 2주차 목표

### 📌 핵심 내용

#### 1주차: 기획 & 설계 완료 ✅
- 사용자 정의 및 문제 정의
- 사용자 흐름 및 예외 상황 정의
- 화면 설계 (프로토타입)
- 기술 설계 (아키텍처, API, DB)
- Git 전략 수립

#### 2주차 목표: 서비스 기반 및 입력 기능 완성
- **[완료] ✅** React 프로젝트 생성 & 라우팅 구성
- **[완료] ✅** Express 백엔드 기반 구축 & DB 연결
- **[완료] ✅** 회원가입 & 로그인 (JWT 기반)
- **[완료] ✅** 텍스트 입력 기능
- **[완료] ✅** PDF 업로드 & 실제 텍스트 추출
- **[완료] ✅** Mock AI 분석 결과 표시
- **[완료] ✅** 전체 분석 흐름 구현

### 🗣️ 발표자 멘트

```
"지난주는 서비스의 전체 방향성과 기술 구조를 설계했습니다. 
이번주는 그 설계에 따라 실제로 코드로 구현하는 주였습니다.

2주차 목표는 '로그인 후 텍스트/PDF 입력 시연'이었고, 
예상했던 일정보다 더 빨리 진행되어 Mock 분석 결과까지 표시할 수 있게 되었습니다."
```

### 📸 필요한 스크린샷
- 없음 (슬라이드에 텍스트만)

---

## Slide 3: 2주차 구현 내용 개요

### 📌 핵심 내용

#### 구현된 주요 기능

| 기능 | 구현 여부 | 기술 |
|------|---------|------|
| 프로젝트 기반 | ✅ | React + Express, Vite, npm |
| 회원가입 | ✅ | Email, Password 검증, bcrypt 암호화 |
| 로그인 | ✅ | JWT Token (Bearer), 1일 만료 |
| 텍스트 입력 | ✅ | 제목 + 본문 입력, 폼 검증 |
| PDF 업로드 | ✅ | Multer (파일 처리), 10MB 제한 |
| **PDF 텍스트 추출** | ✅ | **pdf-parse 라이브러리 (실제 추출)** |
| Mock AI 분석 | ✅ | Mock 데이터 (→ 3주차에 OpenAI API로 교체) |

### 🗣️ 발표자 멘트

```
"이번주 구현의 특징은 '실제 필요한 기능'과 'Mock 기능'을 명확히 구분했다는 점입니다.

특히 PDF 텍스트 추출은 pdf-parse 라이브러리를 사용해서 
실제로 PDF에서 텍스트를 추출하고 있습니다.

하지만 AI 분석 부분은 아직 실제 API가 아니라 Mock 데이터를 사용하고 있습니다. 
이렇게 한 이유는 나중에 설명하겠습니다."
```

### 📸 필요한 스크린샷
- 구현된 기능의 간단한 아이콘 또는 체크마크

---

## Slide 4: 기술 아키텍처 (React ↔ Express ↔ SQLite)

### 📌 핵심 내용

#### 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (브라우저)                       │
│  ┌─────────────────────────────────────────────────────────┐
│  │  React (Vite)                                           │
│  │  ├─ LoginPage (로그인/회원가입)                         │
│  │  ├─ DashboardPage (공지 입력 & 분석)                   │
│  │  └─ API 호출 (axios/fetch)                             │
│  └─────────────────────────────────────────────────────────┘
│                          ↑↓ HTTP(S)
│  ┌─────────────────────────────────────────────────────────┐
│  │  Backend (Express.js)                                   │
│  │  ├─ Auth Routes (회원가입/로그인)                       │
│  │  ├─ Notice Routes (텍스트 입력)                         │
│  │  ├─ PDF Upload (파일 업로드 & 추출)                    │
│  │  ├─ Analysis Routes (Mock 분석)                        │
│  │  └─ Middleware (JWT 인증, CORS)                        │
│  └─────────────────────────────────────────────────────────┘
│                          ↑↓ SQL
│  ┌─────────────────────────────────────────────────────────┐
│  │  SQLite Database                                        │
│  │  ├─ users (id, email, password, name, createdAt)      │
│  │  └─ notices (id, title, content, userId, createdAt)   │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

#### 요청-응답 흐름 (예: 공지 분석)

```
1. 사용자가 텍스트 입력 → "분석하기" 버튼 클릭
   ↓
2. React가 POST /api/notices/analyze 요청 (JWT 토큰 포함)
   ↓
3. Express가 요청 받음 → authMiddleware로 JWT 검증
   ↓
4. analysisController가 analyzeNotice() 호출
   ↓
5. analysisService가 Mock 데이터 반환
   ↓
6. Express가 JSON 응답 반환
   ↓
7. React가 응답받아 분석 결과 화면에 표시
```

### 🗣️ 발표자 멘트

```
"우리 서비스의 기술 구조는 전형적인 3계층 아키텍처를 사용합니다.

프론트엔드는 React로 사용자 인터페이스를 담당하고,
백엔드는 Express로 비즈니스 로직과 데이터 처리를 담당하고,
데이터베이스는 SQLite로 사용자 정보와 공지를 저장합니다.

모든 통신은 HTTP를 통해 이루어지며, 보안을 위해 JWT 토큰을 사용합니다."
```

### 📸 필요한 스크린샷
- 아키텍처 다이어그램 (위의 텍스트 기반 다이어그램 또는 시각적 다이어그램)

---

## Slide 5: 로그인/회원가입 시스템 (JWT 기반)

### 📌 핵심 내용

#### 회원가입 & 로그인 흐름

```
회원가입:
  이름, 이메일, 비밀번호 입력
    ↓
  유효성 검사
  - 이메일 형식 확인 (정규식)
  - 비밀번호 8자 이상
  - 중복 이메일 확인
    ↓
  bcrypt로 비밀번호 암호화 (Salt rounds: 10)
    ↓
  users 테이블에 저장
    ↓
  회원가입 성공 응답

로그인:
  이메일, 비밀번호 입력
    ↓
  DB에서 사용자 찾기
    ↓
  bcrypt.compare()로 비밀번호 검증 (복호화 안함)
    ↓
  JWT 토큰 생성 (유효기간 1일)
    ↓
  토큰과 사용자 정보 반환
    ↓
  localStorage에 토큰 저장
    ↓
  이후 모든 요청에 "Authorization: Bearer {token}" 포함
```

#### 기술 선택 이유
- **bcrypt 암호화**: 단방향 암호화로 보안성 높음, 비밀번호 원문 절대 저장 안함
- **JWT 토큰**: Stateless 인증, 서버에 세션 저장 불필요, 확장성 좋음
- **1일 만료**: 보안성과 사용 편의성의 균형

### 🗣️ 발표자 멘트

```
"로그인 시스템은 보안이 가장 중요합니다.

우리는 bcrypt를 사용해서 비밀번호를 암호화하고,
절대로 평문의 비밀번호를 저장하지 않습니다.
로그인할 때도 암호화된 값과 비교해서 확인합니다.

JWT 토큰을 사용하는 이유는 서버가 세션을 관리하지 않아도 되기 때문입니다.
토큰에 사용자 정보가 암호화되어 있어서,
매 요청마다 토큰을 검증하면 누가 요청을 한 것인지 알 수 있습니다."
```

### 📸 필요한 스크린샷
- 회원가입 화면
- 로그인 화면

---

## Slide 6: 입력 방식 설계 (탭 구조)

### 📌 핵심 내용

#### 왜 탭 구조를 사용했는가?

1. **사용자 혼동 최소화**
   - 텍스트 입력과 PDF 업로드는 완전히 다른 경험
   - 탭으로 명확히 구분해서 사용자가 무엇을 해야 하는지 명확함

2. **상태 관리 단순화**
   - 각 탭마다 독립적인 state 관리
   - 한 탭에서 다른 탭으로 전환할 때 이전 입력값 초기화

3. **향후 확장성**
   - 3주차에 URL 입력 탭 추가 예정
   - 4주차에 이미지 업로드 탭 추가 예정

#### 구현 방식

```javascript
// React state로 activeTab 관리
const [activeTab, setActiveTab] = useState("text"); // "text" 또는 "pdf"

// 탭 전환 시 각 탭의 state 초기화
onClick={() => {
  setActiveTab("text");
  setPdfFile(null);          // PDF 파일 초기화
  setExtractedText("");      // 추출 텍스트 초기화
  setPdfAnalysisResult(null); // 분석 결과 초기화
}}
```

#### UI 구조

```
┌──────────────────────────────────────┐
│ [텍스트 입력] [PDF 업로드]            │  ← 탭 버튼
├──────────────────────────────────────┤
│                                      │
│  제목 입력 필드                       │  ← 텍스트 탭 콘텐츠
│  본문 입력 필드 (10줄)               │
│  [분석하기] 버튼                      │
│                                      │
│  (분석 결과 미리보기)                 │
│                                      │
└──────────────────────────────────────┘
```

### 🗣️ 발표자 멘트

```
"공지를 입력하는 방식을 탭으로 나눈 이유는 
사용자 경험을 명확하게 하기 위함입니다.

텍스트 입력은 제목과 본문을 입력받는 형태이고,
PDF 업로드는 파일을 선택하는 형태인데,
이 둘을 탭으로 구분하면 사용자가 헷갈리지 않습니다.

또한 나중에 URL 입력이나 이미지 업로드가 추가될 때도
같은 구조로 탭을 추가하면 되기 때문에 확장성이 좋습니다."
```

### 📸 필요한 스크린샷
- 텍스트 입력 탭 화면
- PDF 업로드 탭 화면

---

## Slide 7: 텍스트 입력 흐름

### 📌 핵심 내용

#### 사용자 흐름

```
1. 로그인 후 대시보드 접속
   ↓
2. "텍스트 입력" 탭 클릭
   ↓
3. 제목 입력 ("2024 서울대 겨울 방학 프로젝트 공지")
   ↓
4. 본문 입력 (공지의 전체 텍스트)
   ↓
5. "분석하기" 버튼 클릭
   ↓
6. 로딩 중... (분석 요청 중)
   ↓
7. Mock 분석 결과 표시
   - 일정명
   - 시작일 / 마감일
   - 장소
   - 제출물
   - 준비물
   - 안내사항
   - 경고 메시지 (필요시)
```

#### 기술 구현

```javascript
// Frontend (React)
async function handleAnalyze() {
  setError("");
  setSuccess(false);
  setTextAnalysisResult(null);

  if (!content.trim()) {
    setError("분석할 텍스트를 입력해주세요.");
    return;
  }

  setIsAnalyzing(true);

  try {
    const result = await analyzeNotice(content);  // API 호출
    setTextAnalysisResult(result.data);           // 결과 저장
    setSuccess(true);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsAnalyzing(false);
  }
}

// Frontend (API 호출)
export async function analyzeNotice(text) {
  const token = getToken();
  
  const response = await fetch(`${API_BASE_URL}/api/notices/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || "분석 실패");
  }
  
  return data;
}

// Backend (Express)
router.post("/analyze", authMiddleware, analyzeNoticeHandler);

export async function analyzeNoticeHandler(req, res) {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "분석할 텍스트를 입력해주세요.",
      });
    }

    const analysisResult = await analyzeNotice(text);  // Service 호출

    return res.status(200).json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "분석 중 오류가 발생했습니다.",
    });
  }
}
```

### 🗣️ 발표자 멘트

```
"텍스트 입력은 가장 단순한 형태입니다.

사용자가 제목과 본문을 입력하고 '분석하기'를 누르면,
프론트엔드에서 입력값을 검증하고
백엔드에 분석 요청을 보냅니다.

백엔드는 JWT 토큰으로 사용자 인증을 하고
분석 서비스를 호출합니다.

지금은 Mock 데이터를 사용하지만,
3주차에 여기서 OpenAI API로 교체할 예정입니다."
```

### 📸 필요한 스크린샷
- 텍스트 입력 화면 (제목, 본문 입력)
- 분석 결과 화면 (일정명, 날짜, 제출물 등)

---

## Slide 8: PDF 업로드 & 텍스트 추출 (핵심) ⭐

### 📌 핵심 내용

#### 사용자 흐름

```
1. "PDF 업로드" 탭 클릭
   ↓
2. PDF 파일 선택
   ├─ 파일 형식 검사 (PDF만)
   ├─ 파일 크기 검사 (10MB 이하)
   └─ 모든 검사 통과 시 파일 저장
   ↓
3. "업로드" 버튼 클릭
   ↓
4. Backend로 파일 전송 (multipart/form-data)
   ├─ Multer가 파일을 uploads/ 폴더에 저장
   ├─ pdf-parse로 실제 텍스트 추출
   ├─ 추출 텍스트가 짧으면 "스캔된 PDF" 경고
   └─ 임시 파일 삭제 (정리)
   ↓
5. Frontend가 추출된 텍스트 받음
   ↓
6. "분석하기" 버튼으로 텍스트 분석
   ↓
7. Mock 분석 결과 표시
```

#### ⭐ PDF 텍스트 추출 기술 (실제 구현)

```javascript
// Backend - noticeController.js
export async function uploadPDF(req, res) {
  // 1. 파일 존재 확인
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "파일을 선택해주세요.",
    });
  }

  // 2. 파일 크기 검증 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      success: false,
      message: "파일 크기가 10MB를 초과했습니다.",
    });
  }

  // 3. 파일 형식 검증 (PDF만)
  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({
      success: false,
      message: "PDF 파일만 업로드 가능합니다.",
    });
  }

  const filePath = req.file.path;
  let extractedText = "";
  let parser = null;

  try {
    // 4. PDF 파일을 Buffer로 읽기
    const pdfBuffer = await readFile(filePath);

    // 5. pdf-parse로 텍스트 추출 (실제 구현!)
    parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    extractedText = (textResult.text || "").trim();

    // 6. 텍스트 길이로 스캔 PDF 판단 (100자 이하)
    const MIN_TEXT_LENGTH = 100;
    const isScannedOrEmpty = extractedText.length < MIN_TEXT_LENGTH;

    // 7. 성공 응답
    return res.status(201).json({
      success: true,
      message: isScannedOrEmpty
        ? "스캔된 PDF이거나 텍스트를 읽을 수 없는 문서입니다."
        : "PDF 텍스트 추출 성공",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        extractedText: extractedText,
        isScannedOrEmpty: isScannedOrEmpty,
      },
    });
  } catch (error) {
    // 에러 처리 (손상된 파일, 암호 걸린 파일 등)
    let errorMessage = "PDF를 읽을 수 없습니다.";
    
    if (error.message.includes("Invalid PDF")) {
      errorMessage = "손상된 PDF 파일입니다.";
    } else if (error.message.includes("password")) {
      errorMessage = "암호가 걸린 PDF입니다.";
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  } finally {
    // 8. 정리: parser와 임시 파일 삭제
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.error(`PDF parser 정리 실패:`, destroyError.message);
      }
    }

    try {
      await unlink(filePath);  // 임시 파일 삭제
    } catch (deleteError) {
      console.error(`임시 PDF 파일 삭제 실패:`, deleteError.message);
    }
  }
}
```

#### Frontend - PDF 업로드 & 텍스트 추출 표시

```javascript
// Frontend - DashboardPage.jsx
async function handlePdfUpload() {
  setPdfError("");
  setShowExtraction(false);
  setPdfAnalysisResult(null);

  if (!pdfFile) {
    setPdfError("파일을 선택해주세요.");
    return;
  }

  setIsLoading(true);

  try {
    // API로 PDF 업로드
    const result = await uploadPDF(pdfFile);

    // 추출된 텍스트 표시
    setExtractedText(result.data.extractedText || "");
    setIsScannedOrEmpty(result.data.isScannedOrEmpty || false);
    setShowExtraction(true);
    setSuccess(true);

    // 파일 선택 초기화
    const fileInput = document.getElementById("pdf-file-input");
    if (fileInput) {
      fileInput.value = "";
    }
  } catch (err) {
    setPdfError(err.message);
    setShowExtraction(false);
  } finally {
    setIsLoading(false);
  }
}
```

#### 파일 처리 구조 (Backend)

```
1. Frontend에서 PDF 파일 선택
   ↓
2. uploadPDF() 함수로 multipart/form-data 전송
   ↓
3. Express + Multer
   ├─ 요청 받음
   ├─ PDF 파일을 uploads/ 폴더에 저장 (임시)
   └─ req.file에 파일 정보 저장
   ↓
4. noticeController.uploadPDF()
   ├─ 파일 형식, 크기 검증
   ├─ readFile()로 파일을 Buffer로 읽음
   ├─ pdf-parse로 텍스트 추출
   ├─ 텍스트 길이로 스캔 PDF 판단
   └─ 추출된 텍스트 반환
   ↓
5. finally 블록
   ├─ parser 정리 (destroy)
   └─ 임시 파일 삭제 (unlink)
   ↓
6. Frontend에서 추출된 텍스트 받음
```

#### 왜 이렇게 구현했는가?

1. **pdf-parse 라이브러리 선택**
   - 순수 JavaScript로 작성되어 Node.js에서 사용 가능
   - 텍스트 기반 PDF 추출에 최적화
   - OCR이 필요한 스캔 PDF는 별도 처리 (경고 메시지)

2. **파일 검증 (형식 + 크기)**
   - 보안: 악의적인 파일 업로드 방지
   - 성능: 너무 큰 파일로 인한 서버 부하 방지
   - UX: 사용자에게 명확한 오류 메시지 제공

3. **임시 파일 정리**
   - 메모리 누수 방지
   - 서버 저장소 절약
   - 파일 정리 실패해도 서비스는 계속 동작 (try-catch)

4. **스캔 PDF 감지**
   - 추출된 텍스트가 100자 이하면 스캔된 PDF로 판단
   - 사용자에게 "OCR 필요" 경고
   - 3주차에 이미지 기반 OCR 추가 예정

### 🗣️ 발표자 멘트

```
"PDF 업로드는 이번 주차의 핵심 기능입니다.

사용자가 PDF 파일을 선택하면,
우리 백엔드는 pdf-parse 라이브러리를 사용해서
실제로 PDF에서 텍스트를 추출합니다.

Multer라는 라이브러리가 파일 업로드를 처리하고,
추출 후 임시 파일을 정리해서 서버 저장소를 낭비하지 않습니다.

스캔된 PDF나 암호가 걸린 PDF 같은 예외 상황도 처리해서
사용자에게 명확한 오류 메시지를 보여줍니다.

텍스트가 추출되면 프론트엔드에서 보여주고,
'분석하기' 버튼으로 분석할 수 있습니다."
```

### 📸 필요한 스크린샷
- PDF 업로드 화면 (파일 선택)
- PDF 업로드 중 로딩 화면
- 추출된 텍스트 표시 화면
- 분석 결과 화면

---

## Slide 9: Mock AI 분석 결과 표시

### 📌 핵심 내용

#### ⚠️ Mock 데이터 사용 선언

```
현재 상태: Mock 데이터를 사용한 분석 결과 표시
실제 AI: OpenAI API는 아직 연결되지 않음
언제 전환: 3주차에 OpenAI API로 교체 예정
```

#### Mock 분석 데이터 구조

```javascript
// Backend - analysisService.js
const mockResponses = {
  complete: {
    scheduleName: "2024 CalMe 겨울 해커톤",
    startDate: "2024-12-15",
    deadline: "2024-12-31",
    location: "서울대학교 공학관 301호",
    deliverables: [
      "프로젝트 결과물 (GitHub 링크)",
      "발표 자료 (PPT 또는 PDF)",
      "팀 소개 및 프로젝트 설명서",
    ],
    materials: ["노트북", "신분증", "충전기"],
    notes: [
      "사전 등록 필수 (12월 10일까지)",
      "팀 구성은 2-4명",
      "본선 진출팀에 상품 지급",
    ],
    warnings: [],
  },
  incomplete: {
    scheduleName: "겨울 방학 프로젝트",
    startDate: null,
    deadline: "2025-01-31",
    location: null,
    deliverables: ["최종 보고서"],
    materials: [],
    notes: ["온라인 제출"],
    warnings: [
      "시작일을 찾을 수 없습니다",
      "장소 정보가 불명확합니다",
    ],
  },
};

// Mock 분석 로직
export async function analyzeNotice(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("분석할 텍스트가 없습니다");
  }

  // 텍스트 길이로 응답 선택 (실제 AI가 아님!)
  const response =
    text.length > 200 ? mockResponses.complete : mockResponses.incomplete;

  return validateAnalysisResponse(response);
}
```

#### 분석 결과 표시 (UI)

```
┌──────────────────────────────────────────────────────┐
│ 📋 일정 분석 결과                                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  일정명: 2024 CalMe 겨울 해커톤                     │
│                                                      │
│  시작일: 2024-12-15                                 │
│  마감일: 2024-12-31                                 │
│                                                      │
│  장소: 서울대학교 공학관 301호                      │
│                                                      │
│  제출물:                                             │
│  • 프로젝트 결과물 (GitHub 링크)                    │
│  • 발표 자료 (PPT 또는 PDF)                         │
│  • 팀 소개 및 프로젝트 설명서                       │
│                                                      │
│  준비물:                                             │
│  • 노트북                                            │
│  • 신분증                                            │
│  • 충전기                                            │
│                                                      │
│  안내사항:                                           │
│  • 사전 등록 필수 (12월 10일까지)                  │
│  • 팀 구성은 2-4명                                  │
│  • 본선 진출팀에 상품 지급                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Mock vs 실제 AI 비교

| 항목 | Mock (지금) | 실제 AI (3주차) |
|------|-----------|----------------|
| 텍스트 길이로 판단 | ✅ | ❌ |
| 실제 텍스트 분석 | ❌ | ✅ |
| OpenAI API 호출 | ❌ | ✅ |
| 응답 형식 | 고정 JSON | 동적 JSON |
| 날짜 추출 | Mock 데이터 | AI가 추출 |
| 완성도 | 70% | 100% |

### 🗣️ 발표자 멘트

```
"현재 분석 결과는 Mock 데이터를 사용하고 있습니다.

왜냐하면 우리의 목표는 
'전체 서비스 흐름을 먼저 구현하는 것'이었기 때문입니다.

텍스트 입력 → 분석 → 결과 표시 → (3주차에 일정 등록 추가)
이 전체 흐름을 먼저 만들고,
마지막에 AI API를 연결하는 것이 더 효율적입니다.

지금 보이는 분석 결과는 실제로 입력된 텍스트와 무관하게
텍스트 길이에 따라 두 가지 Mock 데이터 중 하나를 반환합니다.

하지만 UI와 데이터 형식은 실제 OpenAI API 응답과 
동일하게 설계했기 때문에,
3주차에 여기서 OpenAI API 호출만 추가하면 바로 적용됩니다."
```

### 📸 필요한 스크린샷
- Mock 분석 결과 화면 (완전한 데이터)
- Mock 분석 결과 화면 (경고 메시지 포함)

---

## Slide 10: 시연 계획 (회원가입 → 로그인 → 입력 → 분석)

### 📌 핵심 내용

#### 시연 순서

```
Step 1: 회원가입
├─ Email: demo@example.com
├─ Password: password123
└─ Name: 데모 사용자
    ↓
Step 2: 로그인
├─ Email: demo@example.com
├─ Password: password123
└─ JWT 토큰 받음 → 대시보드로 이동
    ↓
Step 3: 텍스트 공지 입력 & 분석
├─ 제목: "2024 서울대 겨울 방학 프로젝트"
├─ 본문: 실제 공지 텍스트 입력
└─ "분석하기" → Mock 분석 결과 표시
    ↓
Step 4: PDF 공지 업로드 & 분석
├─ 실제 대학 공지 PDF 선택
├─ "업로드" → PDF 텍스트 실제 추출
├─ 추출된 텍스트 확인
└─ "분석하기" → Mock 분석 결과 표시
```

#### 시연 시 주의사항

1. **네트워크 연결 확인**
   - Frontend와 Backend 모두 실행 중인지 확인
   - Localhost 포트 번호 확인 (5173, 3000 등)

2. **JWT 토큰 확인**
   - 로그인 후 localStorage에 토큰이 저장되었는지 확인
   - API 호출 시 Authorization 헤더에 토큰이 포함되는지 확인

3. **PDF 파일 준비**
   - 실제 대학 공지 PDF 파일 준비
   - 파일 크기 10MB 이하 확인
   - 손상되지 않은 PDF인지 확인

4. **Mock 데이터 이해**
   - 입력 내용과 무관하게 Mock 결과가 표시됨을 설명

### 🗣️ 발표자 멘트

```
"이제 실제로 구현한 기능을 시연하겠습니다.

먼저 회원가입을 하고, 로그인을 한 후,
텍스트 입력으로 분석 기능을 보여드린 다음,
PDF 업로드로 실제 텍스트 추출 기능을 보여드리겠습니다.

시연 중에 보시면, PDF에서 텍스트가 실제로 추출되는 것을 확인할 수 있습니다.
분석 결과는 지금 Mock 데이터이지만,
UI와 데이터 구조는 실제 AI API와 동일합니다."
```

### 📸 필요한 스크린샷
- 시연 흐름을 나타내는 다이어그램 또는 플로우 차트

---

## Slide 11: 기술 설계 이유 - 아키텍처 선택

### 📌 핵심 내용

#### 왜 React + Express 조합인가?

| 선택지 | 장점 | 단점 | 우리의 선택 |
|--------|------|------|-----------|
| **React + Express** (우리) | 자유도↑, 커뮤니티↑, 확장성↑ | 구축시간↑ | ✅ |
| Next.js | 풀스택, 간단함 | 학습곡선 높음 | ❌ |
| Django + React | 안정성↑ | Python 학습 필요 | ❌ |
| Flask + Vue | 가볍다 | 커뮤니티↓ | ❌ |

**우리가 React + Express를 선택한 이유:**

1. **프론트엔드 자유도**
   - 복잡한 UI 상태 관리 가능
   - React는 UI 업데이트가 자주 일어나는 대시보드에 최적

2. **백엔드 유연성**
   - Express는 가볍고 빠름
   - 미들웨어 기반 구조로 기능 추가가 쉬움
   - PDF 처리, AI API 연결 등이 간단

3. **팀 생산성**
   - JavaScript 단일 언어로 통일
   - 온보딩(새로운 팀원 교육)이 빠름

#### 왜 SQLite인가?

| 선택지 | 장점 | 단점 | 우리의 선택 |
|--------|------|------|-----------|
| **SQLite** (우리) | 설정 불필요, 파일 기반 | 동시성↓, 확장성↓ | ✅ |
| PostgreSQL | 안정성↑, 확장성↑ | 설정 복잡함 | ❌ (나중에) |
| MongoDB | 문서DB, 유연함 | 관계형 데이터 부적합 | ❌ |
| MySQL | 안정성, 널리 사용 | 설정 복잡함 | ❌ |

**우리가 SQLite를 선택한 이유:**

1. **빠른 개발**
   - 별도의 서버 설치 불필요
   - `npm install better-sqlite3`만으로 완료
   - 바로 시작할 수 있음

2. **MVP 단계에 적합**
   - 동시 사용자 수가 적음 (팀원만 테스트)
   - 복잡한 쿼리가 없음
   - 데이터 일관성이 중요하지 않음 (아직)

3. **포팅(마이그레이션) 용이**
   - 나중에 PostgreSQL로 쉽게 전환 가능
   - SQL 문법은 동일
   - 4주차 배포 시 PostgreSQL로 변경 예정

#### 아키텍처 진화 계획

```
2주차 (현재): React + Express + SQLite
             ↓ (MVP 완성)
3주차: React + Express + SQLite (그대로 유지)
             ↓ (배포 준비)
4주차: React + Express + PostgreSQL (확장)
```

### 🗣️ 발표자 멘트

```
"우리 팀은 왜 React와 Express를 선택했을까요?

가장 큰 이유는 '빠른 개발'입니다.

JavaScript 하나의 언어로 프론트와 백을 모두 개발할 수 있고,
이미 존재하는 라이브러리들이 풍부해서
처음부터 모든 것을 만들 필요가 없습니다.

SQLite는 설정 없이 바로 시작할 수 있어서
MVP 개발에 최적입니다.

나중에 사용자가 많아지면 PostgreSQL로 전환할 계획이고,
SQL 문법이 같아서 마이그레이션이 어렵지 않습니다."
```

### 📸 필요한 스크린샷
- 없음 (테이블과 텍스트로 설명)

---

## Slide 12: 기술 설계 이유 - 인증 방식 & 데이터베이스

### 📌 핵심 내용

#### 왜 JWT 토큰 기반 인증인가?

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **JWT** (우리) | 토큰에 정보 암호화 | Stateless, 확장성↑ | 토큰 탈취 위험 |
| Session | 서버에 세션 저장 | 안전함 | Stateful, 확장성↓ |
| OAuth | 제3자 인증 | 편리함 | 설정 복잡, MVP 제외 |

**우리가 JWT를 선택한 이유:**

1. **Stateless 아키텍처**
   - 서버가 세션을 저장할 필요 없음
   - 여러 서버 인스턴스 간 확장이 쉬움
   - 데이터베이스 부하 감소

2. **모바일 앱 연동 용이**
   - 토큰만으로 인증 가능
   - HTTP 헤더에 토큰 포함하면 됨
   - 4주차에 모바일 앱 추가 시 유리

3. **API 중심 설계**
   - REST API 설계에 최적
   - GraphQL로 전환 가능

#### JWT 토큰 구조

```
Header.Payload.Signature

예시:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJ1c2VySWQiOjEsImVtYWlsIjoiZGVtb0BleGFtcGxlLmNvbSIsImlhdCI6MTYyNDMwNTc3MiwiZXhwIjoxNjI0MzkyMTcyfQ
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

1. Header: 알고리즘 (HS256), 토큰 타입 (JWT)
2. Payload: 사용자 ID, 이메일, 발급 시간, 만료 시간
3. Signature: 서버의 JWT_SECRET으로 서명 (위변조 방지)
```

#### bcrypt로 비밀번호 암호화하는 이유

```javascript
// ❌ 나쁜 예: 평문 저장
password = "password123"  // 절대 금지!

// ❌ 나쁜 예: 단순 해시
password = SHA256("password123")  // 쉽게 역추론됨

// ✅ 좋은 예: bcrypt 사용 (우리)
hashedPassword = bcrypt.hash("password123", saltRounds=10)
// 결과: $2b$10$... (110글자, 매번 다름)
```

**bcrypt 사용 이유:**

1. **단방향 암호화**
   - 해시값에서 원본 비밀번호로 돌아갈 수 없음
   - 데이터베이스가 탈취되어도 비밀번호는 안전

2. **Salt 적용**
   - 같은 비밀번호도 매번 다른 해시값 생성
   - Rainbow table 공격 방지

3. **느린 연산**
   - 의도적으로 연산을 늦게 함
   - 브루트포스 공격 방어

#### 데이터베이스 스키마

```sql
-- users 테이블
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,          -- 이메일 (중복 방지)
  password TEXT NOT NULL,                -- bcrypt 해시값
  name TEXT NOT NULL,                    -- 사용자 이름
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- notices 테이블
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                   -- 공지 제목
  content TEXT NOT NULL,                 -- 공지 내용
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**설계 포인트:**

1. **email 칼럼에 UNIQUE 제약**
   - 중복 가입 방지
   - 로그인할 때 쿼리 최적화

2. **password는 bcrypt 해시**
   - 평문 절대 저장 안함

3. **created_at으로 시간 추적**
   - 공지 최신순 정렬
   - 감사 로그(audit log) 기초

### 🗣️ 발표자 멘트

```
"인증 방식은 서비스의 보안을 좌우합니다.

우리는 JWT 토큰을 사용합니다.
로그인하면 사용자 정보가 암호화된 토큰을 발급해주고,
이후 모든 API 호출할 때 이 토큰을 포함해서 요청합니다.

서버는 토큰의 서명을 검증해서 
사용자가 정말 우리 서버에서 발급받은 토큰인지 확인합니다.

비밀번호는 bcrypt로 단방향 암호화하기 때문에
데이터베이스가 탈취되어도 비밀번호는 안전합니다.

로그인할 때 사용자가 입력한 비밀번호와
저장된 해시값을 비교해서 맞는지 확인합니다."
```

### 📸 필요한 스크린샷
- JWT 구조 다이어그램
- 비밀번호 암호화 흐름도

---

## Slide 13: 기술 설계 이유 - PDF 처리 & Mock 데이터

### 📌 핵심 내용

#### 왜 PDF를 먼저 텍스트로 추출하는가?

```
사용자 입력 방식:
1. 텍스트 입력 → 바로 분석
2. PDF 업로드 → 텍스트 추출 → 분석

왜 2번 방식으로 통일하는가?
```

**이유:**

1. **분석 엔진 단순화**
   - AI는 항상 텍스트만 분석
   - PDF, 이미지, URL 처리는 별도 (전처리)
   - 분석 로직은 오직 텍스트만 받음

2. **향후 확장성**
   ```
   텍스트 입력     → 바로 분석
   PDF 업로드     → 텍스트 추출 → 분석
   이미지 업로드  → OCR 변환    → 분석  (4주차)
   URL 제출       → 크롤링      → 분석  (MVP 제외)
   
   모두 분석 엔진 앞에서 "텍스트로 통일"
   ```

3. **오류 처리 명확화**
   - PDF 처리 실패 ≠ 분석 실패
   - 각각 다른 오류 메시지 제공

#### 아키텍처: 입력 → 전처리 → 분석

```
┌──────────────────────────────────────────┐
│ 사용자 입력                              │
│ • 텍스트 입력                           │
│ • PDF 파일                              │
│ • (향후) 이미지                         │
│ • (향후) URL                            │
└──────────────────────┬───────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ 입력 방식별 전처리           │
        ├──────────────────────────────┤
        │ 텍스트: 그대로               │
        │ PDF: pdf-parse 추출          │
        │ 이미지: (Tesseract OCR)     │
        │ URL: (node-fetch 크롤링)    │
        └──────────────┬───────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ "텍스트" 형태로 통일        │
        └──────────────┬───────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ AI 분석 엔진 (OpenAI API)    │
        │ → 일정명, 날짜, 제출물 추출 │
        └──────────────────────────────┘
```

#### 왜 Mock 데이터를 사용하는가?

| 단계 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **2주차 (현재)** | Mock 데이터 | 빠른 개발, 전체 흐름 먼저 | 실제 AI 아님 |
| **3주차** | OpenAI API | 실제 분석 | API 비용 |
| **4주차** | OpenAI API | 완성 버전 | - |

**Mock을 먼저 사용하는 이유:**

1. **전체 흐름 검증**
   ```
   입력 → 분석 → 결과 표시 → (3주차) 일정 등록
   
   이 전체 흐름이 올바른지 먼저 확인해야 함
   AI가 없이도 확인 가능
   ```

2. **UI/UX 개발**
   - 분석 결과 화면을 미리 만들 수 있음
   - AI 응답 형식 미리 결정 가능
   - 3주차에 OpenAI 응답 형식을 UI에 맞추면 됨

3. **비용 효율**
   - OpenAI API는 토큰당 비용 발생
   - 개발 중에 불필요한 비용 낭비 없음
   - 최종 테스트 단계에서만 실제 API 사용

4. **병렬 개발 가능**
   ```
   2주차: Frontend (UI) + Backend (Mock) 개발 병렬
   3주차: AI 분석 로직만 교체 (Frontend 수정 최소화)
   4주차: 최적화 & 배포
   ```

#### Mock → 실제 API로 전환하기

```javascript
// 현재 (Mock)
export async function analyzeNotice(text) {
  const response =
    text.length > 200 ? mockResponses.complete : mockResponses.incomplete;
  return validateAnalysisResponse(response);
}

// 3주차 (OpenAI API로 교체)
export async function analyzeNotice(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: `다음 공지에서 일정을 추출해주세요: ${text}`
    }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "analysis_result",
        schema: {
          type: "object",
          properties: {
            scheduleName: { type: "string" },
            startDate: { type: "string" },
            deadline: { type: "string" },
            // ... (Mock과 동일한 구조)
          }
        }
      }
    }
  });
  
  return validateAnalysisResponse(JSON.parse(response.content));
}

// 함수 시그니처와 반환 형식이 동일하므로
// Frontend는 수정할 필요 없음!
```

**중요:** 함수 인터페이스가 동일하므로 Frontend 코드 수정 불필요

### 🗣️ 발표자 멘트

```
"PDF를 먼저 텍스트로 추출하는 이유는 
AI 분석 엔진을 단순하게 유지하기 위함입니다.

AI는 항상 '텍스트'만 분석하고,
입력 방식별로 텍스트로 변환하는 전처리를 앞에 둡니다.

이렇게 하면 나중에 이미지 OCR이나 URL 크롤링을 추가해도
분석 엔진은 변경할 필요가 없습니다.

Mock 데이터를 사용하는 이유는
'전체 서비스 흐름을 먼저 만들기 위함'입니다.

AI가 없어도 UI와 데이터 흐름이 올바른지 확인할 수 있고,
3주차에 OpenAI API로 교체할 때도
함수 인터페이스가 같으므로 Backend만 수정하면 됩니다.

Frontend는 아무것도 수정할 필요가 없습니다."
```

### 📸 필요한 스크린샷
- 아키텍처 다이어그램 (입력 → 전처리 → 분석)
- Mock → 실제 API 전환 다이어그램

---

## Slide 14: 어려웠던 점 & 해결 과정

### 📌 핵심 내용

#### 1️⃣ PDF 라이브러리 버전 호환성 문제

**문제 상황:**
```
pdf-parse 라이브러리를 사용하려고 했는데
버전에 따라 import 방식이 달랐음

예: pdf-parse 2.4.5
- import { PDFDocument } from 'pdf-parse'  ❌ (먹지 않음)
- new PDFParse({ data: buffer })  ✅ (이건 먹음)
```

**해결 과정:**
1. 공식 문서 다시 읽음
2. GitHub Issues에서 비슷한 문제 찾음
3. Named export가 아니라 default export 사용
4. 정확한 버전 명시 (package.json에 "pdf-parse": "2.4.5")

**배운 점:**
- npm 패키지 버전이 중요함
- 라이브러리 문서와 GitHub Issues를 함께 확인 필요

#### 2️⃣ Express에서 Multer로 파일 업로드 처리

**문제 상황:**
```
파일이 업로드되지 않는 오류 발생
POST /api/notices/upload 요청이 400 에러 반환
```

**원인:**
- Multer의 storage 설정에서 destination 폴더가 없음
- Multer가 자동으로 폴더를 만들지 않음

**해결 과정:**
1. Multer 공식 문서 읽음
2. uploads/ 폴더를 미리 생성
3. 폴더 경로를 __dirname을 이용해 절대경로로 지정
4. .gitignore에 uploads/를 추가 (임시 파일 무시)

**코드 개선:**
```javascript
// 개선 전: 폴더가 없으면 에러
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");  // 폴더 없으면 실패
  }
});

// 개선 후: 절대경로 사용
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads");
    cb(null, dir);  // 폴더는 미리 생성
  }
});
```

**배운 점:**
- Node.js의 경로 처리는 복잡함 (__dirname, path.join 사용)
- 파일 시스템 작업 시 절대경로 사용 권장

#### 3️⃣ JWT 토큰 인증 미들웨어 오류

**문제 상황:**
```
로그인은 성공하는데
다른 API (POST /api/notices/analyze) 호출 시 401 Unauthorized
```

**원인:**
- Frontend에서 Authorization 헤더를 보내지 않음
- Backend의 authMiddleware가 토큰을 찾을 수 없음

**해결 과정:**
1. Network 탭에서 요청 헤더 확인
2. Authorization 헤더가 없음을 발견
3. Frontend의 API 호출 함수에서 토큰을 헤더에 포함하도록 수정

**코드 개선:**
```javascript
// 개선 전: 토큰을 보내지 않음
export async function analyzeNotice(text) {
  const response = await fetch(`${API_BASE_URL}/api/notices/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization 헤더 없음! ❌
    },
    body: JSON.stringify({ text }),
  });
}

// 개선 후: 토큰 포함
export async function analyzeNotice(text) {
  const token = getToken();  // localStorage에서 토큰 가져오기
  
  const response = await fetch(`${API_BASE_URL}/api/notices/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,  // ✅ 토큰 포함
    },
    body: JSON.stringify({ text }),
  });
}
```

**배운 점:**
- HTTP 헤더 확인은 개발자 도구 Network 탭에서!
- API 호출 시 토큰 전달 패턴을 일관되게 유지 필요

#### 4️⃣ React State 업데이트 타이밍 문제

**문제 상황:**
```
PDF 업로드 후 파일 선택 input을 초기화하려고 했는데
초기화가 되지 않음

const fileInput = document.getElementById("pdf-file-input");
if (fileInput) {
  fileInput.value = "";  // input value 초기화 안됨
}
```

**원인:**
- HTML input[type="file"]은 보안상 JavaScript로 직접 수정 불가
- fileInput.value = ""는 작동하지 않음

**해결 과정:**
1. Stack Overflow 검색
2. React에서 파일 입력 초기화하는 다양한 방법 발견
3. 가장 간단한 방법: 다시 파일 선택하도록 유도
4. 또는 controlled input으로 변경

**코드 개선:**
```javascript
// 방법 1: input의 ref를 사용 (React 권장)
const fileInputRef = useRef(null);

function handlePdfUpload() {
  // ... 업로드 로직
  if (fileInputRef.current) {
    fileInputRef.current.value = "";  // 작동함
  }
}

return (
  <input
    ref={fileInputRef}
    type="file"
    id="pdf-file-input"
  />
);

// 방법 2: 현재 우리 코드 (작동하지만 비권장)
const fileInput = document.getElementById("pdf-file-input");
if (fileInput) {
  fileInput.value = "";  // 보안 제약으로 작동 안할 수 있음
}
```

**배운 점:**
- React에서는 ref를 사용해야 DOM 요소를 직접 조작할 수 있음
- HTML input[type="file"]은 보안상 제약이 많음

### 🗣️ 발표자 멘트

```
"2주차 개발하면서 여러 오류를 만났고, 하나하나 해결했습니다.

첫 번째는 pdf-parse 라이브러리 버전 호환성 문제였습니다.
버전마다 import 방식이 달라서 처음엔 헷갈렸지만,
공식 문서와 GitHub Issues를 찾아서 해결했습니다.

두 번째는 Multer 파일 업로드 설정입니다.
폴더 경로를 절대경로로 지정하지 않으면 오류가 발생했습니다.

세 번째는 JWT 토큰 인증입니다.
API 호출할 때 Authorization 헤더에 토큰을 포함하지 않으면
서버가 요청을 거부했습니다.
Network 탭에서 요청 헤더를 확인하면서 문제를 찾을 수 있었습니다.

네 번째는 React에서 파일 입력 초기화입니다.
JavaScript로 직접 input[type='file'].value를 수정하려고 했는데 작동하지 않아서,
React의 ref를 사용하는 방법으로 개선했습니다.

이런 경험들이 다음 주차 개발에 큰 도움이 될 것 같습니다."
```

### 📸 필요한 스크린샷
- 에러 메시지 (콘솔 화면)
- 해결 전후 비교 코드

---

## Slide 15: 3주차 계획

### 📌 핵심 내용

#### 3주차 목표: AI 분석 및 일정 등록

| 항목 | 기능 | 상태 |
|------|------|------|
| **AI 분석** | Mock → OpenAI API 교체 | 🔄 진행 예정 |
| **결과 수정** | UI에서 분석 결과 수정 | 🔄 진행 예정 |
| **일정 저장** | 수정된 일정을 DB에 저장 | 🔄 진행 예정 |
| **중복 감지** | 같은 일정 중복 여부 확인 | 🔄 진행 예정 |

#### 3주차 상세 계획 (체크리스트.md 기반)

**월요일: AI 분석 (OpenAI API 연결)**
- [ ] OpenAI API Key 설정
- [ ] 프롬프트 작성 (공지 → 일정 추출)
- [ ] JSON Schema 정의
- [ ] 다양한 테스트 공지로 테스트
- [ ] 응답 검증 로직 추가

**화요일: 결과 확인 및 수정**
- [ ] 분석 결과 화면에서 각 필드 수정 가능하게
- [ ] 일정명 수정
- [ ] 날짜 수정 (달력 또는 입력)
- [ ] 장소, 제출물, 메모 수정
- [ ] 일정 삭제 & 일정 추가 기능

**수요일: 일정 저장**
- [ ] 선택된 일정만 DB에 저장
- [ ] events 테이블 생성
- [ ] notice와 event의 관계 설정 (1:N)
- [ ] 저장 성공/실패 처리

**목요일: 중복 감지 & 예외 처리**
- [ ] 같은 사용자 + 같은 일정명 + 같은 날짜 = 중복 판단
- [ ] 중복 경고 화면 표시
- [ ] 사용자가 강제로 등록할 수 있도록
- [ ] 전체 통합 테스트

#### 기술 관점에서 필요한 작업

```javascript
// 1. Backend: events 테이블 추가
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  schedule_name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  deadline TEXT,
  location TEXT,
  deliverables TEXT,  -- JSON 배열
  notes TEXT,
  is_registered BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notice_id) REFERENCES notices(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

// 2. Backend: 중복 감지 로직
function isDuplicateEvent(userId, scheduleName, date) {
  const existing = db.prepare(`
    SELECT * FROM events
    WHERE user_id = ? AND schedule_name = ? AND start_date = ?
  `).get(userId, scheduleName, date);
  
  return !!existing;
}

// 3. Frontend: 일정 수정 UI 추가
// analysisResult의 각 필드를 수정 가능하게
<input
  value={analysisResult.scheduleName}
  onChange={(e) => setAnalysisResult({
    ...analysisResult,
    scheduleName: e.target.value
  })}
/>

// 4. Frontend: API 호출 (일정 저장)
export async function saveEvents(events) {
  const token = getToken();
  
  const response = await fetch(`${API_BASE_URL}/api/events/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
  });
  
  return response.json();
}
```

#### 3주차 후 예상 기능

```
로그인
  ↓
공지 입력 (텍스트/PDF)
  ↓
✅ 실제 OpenAI API로 분석 (2주차: Mock)
  ↓
분석 결과 확인 & 수정 (새로운 기능)
  ↓
✅ 일정 저장 (새로운 기능)
  ↓
(4주차) 캘린더에서 확인
```

### 🗣️ 발표자 멘트

```
"3주차는 AI 분석을 실제 OpenAI API로 교체하고,
사용자가 분석 결과를 수정한 후 저장할 수 있게 하는 주입니다.

현재 Mock 데이터를 사용하지만,
3주차에 OpenAI API로 교체하면 실제 분석이 작동합니다.

사용자가 AI 결과에 만족하지 않으면
날짜, 제출물 등을 직접 수정할 수 있도록 하고,
수정된 일정을 데이터베이스에 저장할 예정입니다.

같은 일정이 이미 등록되어 있으면
'중복 일정이 있습니다' 경고를 표시해서
사용자가 의도적으로 등록할지 선택할 수 있게 합니다."
```

### 📸 필요한 스크린샷
- 없음 (아직 구현하지 않았으므로 스크린샷 불가)
- 대신 플로우 다이어그램이나 테이블 구조도 추가 가능

---

## Slide 16: 마무리

### 📌 핵심 내용

#### 2주차 요약

```
시작: 기획 & 설계 완료 (1주차)
  ↓
진행: 기반 구축 & 입력 기능 (2주차)
  ├─ React + Express + SQLite 아키텍처 ✅
  ├─ JWT 기반 로그인/회원가입 ✅
  ├─ 텍스트 입력 ✅
  ├─ PDF 업로드 & 실제 텍스트 추출 ✅
  └─ Mock AI 분석 ✅
  ↓
목표달성: 로그인 후 텍스트/PDF 입력 시연 완료 ✅
```

#### 기술적 성취

| 항목 | 성과 |
|------|------|
| **Frontend** | React + Vite 프로젝트 생성, 라우팅, 상태 관리 |
| **Backend** | Express API 설계, 미들웨어, 에러 처리 |
| **인증** | JWT + bcrypt 보안 시스템 |
| **파일 처리** | Multer + pdf-parse 라이브러리 활용 |
| **데이터베이스** | SQLite 설계 및 구현 |

#### 개발 문화

- **Git 브랜치 전략**: feature/브랜치로 기능별 개발
- **코드 리뷰**: Pull Request로 코드 검토
- **문서화**: README, API 문서, 주석 작성

#### 다음 주차 예고

```
3주차: AI 분석 및 일정 등록 (핵심 기능!)
4주차: 캘린더 & 대시보드 (완성 단계)
```

### 🗣️ 발표자 멘트

```
"2주차는 매우 생산적인 주였습니다.

기획과 설계를 바탕으로 실제 코드로 구현했고,
회원가입부터 PDF 텍스트 추출까지
전체 입력 기능을 완성했습니다.

특히 PDF 텍스트 추출이라는 실제 기술을 구현했으므로,
'완전히 Mock인 구현'과는 다릅니다.

3주차에는 OpenAI API를 연결해서
실제 AI 분석이 작동하고,
사용자가 분석 결과를 수정해서 저장할 수 있게 합니다.

4주차에는 캘린더와 대시보드를 구현해서
전체 서비스를 완성할 예정입니다.

질문이 있으신가요?"
```

### 📸 필요한 스크린샷
- 없음 (요약 슬라이드)

---

# 📋 시연 체크리스트

발표 전에 확인해야 할 사항:

```
[ ] Frontend 서버 실행 (http://localhost:5173)
[ ] Backend 서버 실행 (http://localhost:3000)
[ ] 네트워크 통신 테스트 (GET /api/test)
[ ] 데이터베이스 연결 확인
[ ] JWT 토큰 localStorage 저장 확인
[ ] 실제 공지 PDF 파일 준비 (10MB 이하)
[ ] 회원가입 테스트 계정 준비
[ ] 로그인 테스트
[ ] 텍스트 입력 시연 준비
[ ] PDF 업로드 시연 준비
[ ] 콘솔 에러 없는지 확인 (F12 Network, Console)
[ ] 발표 노트 최종 점검
```

---

# 🎤 발표 팁

1. **시각적 보조**
   - 슬라이드를 읽지 말고, 핵심만 언급
   - 실시간 시연이 가장 강력한 설명

2. **시간 관리**
   - 각 슬라이드 30~60초
   - 시연에 3분 사용
   - 여유 있게 진행

3. **청중 집중**
   - "질문 있으신가요?" 수시로 던지기
   - 멘토 피드백 경청
   - 어려운 부분은 간단하게 설명

4. **자신감**
   - 2주차 구현 결과물에 자부심 가지기
   - Mock이라는 것을 명확히 하되, 그것도 좋은 설계임을 어필

---

# ✅ 슬라이드 검증 체크리스트

- [ ] 각 슬라이드마다 제목 명확함
- [ ] 핵심 내용과 멘트가 일치함
- [ ] 기술 설명이 과하지 않음 (개발자 아닌 사람도 이해 가능한 수준)
- [ ] Mock과 실제 구현을 명확히 구분함
- [ ] 코드 예시가 이해하기 쉬움
- [ ] 흐름이 자연스러움 (Slide 1 → 2 → 3 → ... → 16)
- [ ] 3주차 계획이 구체적임
- [ ] 오타 없음

---

**끝!**

이 슬라이드 구성으로 발표하면 10분 내에 마칠 수 있습니다.

**다음 단계:**
1. 이 슬라이드 구성을 검토해주세요
2. 수정 사항이 있으면 알려주세요
3. 확인되면 슬라이드별 상세 발표 대본을 작성하겠습니다

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

flowchart LR
    USER["사용자"]

    subgraph FRONT["React 화면"]
        SEARCH["종목 검색"]
        COMPANY["기업 정보"]
        FINANCE["재무제표·차트"]
        NEWS["뉴스"]
        AI["AI 분석"]
    end

    subgraph SERVER["Express 서버"]
        COMPANY_API["기업 목록 API"]
        FINANCE_API["재무제표 API"]
        NEWS_API["뉴스 API"]
        AI_API["AI 분석 API"]
    end

    subgraph DB["Supabase"]
        COMPANIES[("companies")]
        FINANCIALS[("financial_statements")]
    end

    subgraph OUTSIDE["외부 API"]
        DART["OpenDART"]
        KIND["KIND"]
        NAVER["뉴스 API"]
        AI_MODEL["AI API"]
    end

    USER --> SEARCH

    SEARCH --> COMPANY_API
    COMPANY_API --> COMPANIES
    COMPANIES --> COMPANY_API
    COMPANY_API --> SEARCH

    SEARCH --> COMPANY
    COMPANY --> FINANCE
    FINANCE --> FINANCE_API
    FINANCE_API --> FINANCIALS
    FINANCIALS --> FINANCE_API
    FINANCE_API --> FINANCE

    COMPANY_API --> DART
    COMPANY_API --> KIND
    FINANCE_API --> DART

    COMPANY --> NEWS
    NEWS --> NEWS_API
    NEWS_API --> NAVER

    FINANCE --> AI
    AI --> AI_API
    AI_API --> AI_MODEL
    ```mermaid
flowchart LR
A --> B
```
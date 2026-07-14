# SmartFF Project Context

This document defines the project philosophy, development rules, and coding guidelines for SmartFF.

Last Updated: 2026-07-13

---

# Project Overview

SmartFF is an AI Decision Support System (DSS) for GS25 convenience store owners.

The goal is **not** to automate ordering.

The goal is to help store owners make better ordering decisions through data analysis.

SmartFF analyzes:

- Sales Data
- Order Data
- Inventory Data
- Waste Data
- Management Accounting Metrics

AI explains the data.

The store owner makes the final decision.

---

# Product Philosophy

SmartFF is NOT:

- ERP
- POS
- Automatic Ordering System

SmartFF IS:

- AI Decision Support System
- Management Accounting Dashboard
- Data-driven Recommendation Tool

Never implement automatic ordering unless explicitly requested.

---

# Source of Truth

Always follow project documents in this order.

Priority

1. project_plan.md
2. design_system.md
3. claude.md
4. tasks.md

If documents conflict, follow the higher priority document.

---

# Tech Stack

Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS

Backend

- Express.js
- TypeScript

Data Pipeline

- Python
- Pandas

Visualization

- Recharts

Version Control

- Git
- GitHub

---

# Development Flow

Development should follow this order.

1. Data Pipeline
2. Backend API
3. Frontend Integration

Until backend APIs are ready,

use mock API responses.

The Master Dataset is the single source of truth.

---

# Project Structure

```
smartff-agent/

frontend/
    src/
        components/
        pages/
        layouts/
        hooks/
        services/
        types/
        utils/
        constants/

backend/
    src/

data/
    raw/
    master/
    processed/
    scripts/

docs/
    design_system.md
    project_plan.md
    tasks.md
    scrum.md
    discussion.md
    

README.md
CLAUDE.md
```

Keep the project structure simple.

Avoid unnecessary folders.

---

# Data Pipeline

All business logic must follow this flow.

Raw Excel Files

↓

Python ETL

↓

Product Master

↓

Master Dataset

↓

Backend API

↓

Frontend

Never modify raw data directly.

Always generate processed data through Python ETL.

---

# Page Responsibilities

Dashboard

"What should I do today?"

- AI Brief
- KPI Summary
- Recommendation
- Financial Summary

---

Analysis

"Why did this happen?"

- Sales Trend
- Hourly Analysis
- Weekday Analysis
- Waste Trend

---

Financial

"How profitable is the business?"

- Margin Analysis
- Waste Cost
- Profit Contribution
- Category Profitability

---

Upload

"How do I provide my data?"

- File Upload
- Upload History
- Dataset Status
- Validation Result

Never mix page responsibilities.

---

# UI Guidelines

Always follow design_system.md.

Principles

- Korean-first UI
- GS25 store owner perspective
- Enterprise SaaS
- Spacious layout
- Minimal interface
- Professional
- Trustworthy

Consistency is more important than creativity.

Reuse components whenever possible.

---

# React Guidelines

Use

- Functional Components
- TypeScript
- Tailwind CSS

Structure

```
components/
pages/
layouts/
hooks/
services/
types/
utils/
constants/
```

Create reusable components only when actually reused.

Prefer composition over duplication.

---

# Coding Principles

Always prefer

- Readable code
- Reusable components
- Simple architecture
- Small components
- Explicit naming

Avoid

- Premature optimization
- Unnecessary abstraction
- Duplicated code
- Speculative features

Implement only what is required.

---

# Naming Convention

Components

PascalCase

```
KPICard.tsx
RecommendationCard.tsx
```

Variables

camelCase

```
salesTrend
profitMargin
```

Constants

UPPER_SNAKE_CASE

```
API_BASE_URL
MAX_UPLOAD_SIZE
```

Folders

lowercase

```
components
pages
services
hooks
```

---

# Git Convention

Commit prefixes

```
feat:
fix:
docs:
style:
refactor:
chore:
```

Commit message

**제목은 한글로 간단하게 내용을 요약하세요.**

Examples

```
feat(financial): 마진 기여도 차트 추가

fix(upload): Excel 파일 검증

docs: 디자인 시스템 업데이트
```

---

# MVP Scope

Current MVP includes

- Dashboard
- Analysis
- Financial
- Upload
- CSV Upload
- Product Master Generation
- Master Dataset Generation
- Management Accounting Analysis
- AI Recommendation

Do NOT implement

- Automatic Ordering
- POS Integration
- Weather Integration
- Machine Learning Prediction
- Real-time Inventory

unless explicitly requested.

---

# Before Implementing

Always verify:

1. Is this feature defined in project_plan.md?
2. Does design_system.md already define the UI?
3. Can an existing component be reused?
4. Does this require changes to the Master Dataset?
5. Is there a simpler implementation?

If uncertain,

ask before implementing.

---

# Success Criteria

Every implementation should be

✓ Based on project_plan.md

✓ Consistent with design_system.md

✓ Helpful for GS25 store owners

✓ Simple

✓ Reusable

✓ Readable

✓ Production-ready

Build software that helps people make better decisions,

not software that makes decisions for them.
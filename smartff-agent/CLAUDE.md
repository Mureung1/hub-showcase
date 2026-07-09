# CLAUDE.md

> SmartFF Agent Project Context
>
> This document provides project context, development rules, and coding guidelines for Claude Code.
>
> Last Updated: 2026-07-09

---

# Project Overview

SmartFF Agent is an AI Decision Support System (DSS) for GS25 convenience store owners.

The goal is **NOT** to automate ordering.

The goal is to help store owners make better ordering decisions by analyzing:

- Sales Data
- Order Data
- Waste Data
- Management Accounting Metrics

Always preserve this philosophy.

---

# Product Philosophy

SmartFF is NOT

- ERP
- POS
- Automatic Ordering System

SmartFF IS

- AI Decision Support System
- Management Accounting Dashboard
- Data-driven Recommendation Tool

AI explains the data.

The store owner makes the final decision.

Never implement automatic ordering unless explicitly requested.

---

# Source of Truth

Always follow the project documents in the following order.

Priority

1. PROJECT_PLAN.md
2. DESIGN_SYSTEM.md
3. CLAUDE.md

If there is any conflict,

PROJECT_PLAN.md has the highest priority.

---

# Tech Stack

Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS

Backend (Future)

- Express.js
- TypeScript

Data Analysis

- Python
- Pandas

Visualization

- Recharts

Version Control

- Git
- GitHub

---

# Backend Timeline

Express backend development starts mid-next week.

Until then, focus on Frontend only.

Assume mock API responses for now.

---

# Project Structure

```
web/

src/

components/

pages/

layouts/

hooks/

services/

types/

utils/

constants/
```

Keep the project structure simple.

Do not introduce unnecessary folders.

---

# Page Responsibilities

Dashboard

Answer:

"What should I do today?"

Purpose

- AI Brief
- KPI
- Recommendation
- Category Summary

---

Analysis

Answer

"Why did this happen?"

Purpose

- Sales Trend
- Hourly Analysis
- Weekly Pattern
- Waste Analysis

---

Financial

Answer

"How does this affect profitability?"

Purpose

- Margin Analysis
- Waste Cost
- Profit Contribution
- Category Profitability

---

Upload

Answer

"How do I provide my data?"

Purpose

- CSV Upload
- Upload History
- Dataset Status

Never mix page responsibilities.

---

# UI Guidelines

Always follow DESIGN_SYSTEM.md.

Important principles

- Enterprise SaaS
- Korean-first UI
- GS25 store owner perspective
- Spacious layout
- Minimal interface
- Professional
- Trustworthy

Never invent a new design language.

Reuse existing components whenever possible.

Consistency is more important than creativity.

---

# Coding Principles

Always prefer

- readable code
- reusable components
- simple architecture
- small components
- explicit naming

Avoid

- premature optimization
- unnecessary abstraction
- duplicated code
- speculative features

Implement only what is required.

---

# React Guidelines

Use

- Functional Components
- TypeScript
- Tailwind CSS

Prefer composition over duplication.

If a component is reusable,

move it into

components/common

Do not create common components before they are actually reused.

---

# Naming Convention

Components

PascalCase

Example

```
KPICard.tsx

RecommendationCard.tsx
```

Variables

camelCase

```
salesTrend

wasteRate
```

Constants

UPPER_SNAKE_CASE

```
API_BASE_URL
```

Folders

lowercase

```
components

services

hooks
```

---

# Git Convention

Commit format

```
feat:

fix:

docs:

style:

refactor:

chore:
```

Examples

```
feat(dashboard): add KPI cards

docs: update DESIGN_SYSTEM

fix(upload): validate CSV file
```

---

# MVP Scope

Current MVP includes

- Dashboard
- Analysis
- Financial
- Upload
- CSV Data Processing
- Management Accounting Analysis
- AI Recommendation

Do NOT implement

- Automatic Ordering
- POS Integration
- Weather Integration
- Real-time Inventory
- Machine Learning Prediction

unless explicitly requested.

---

# Before Implementing

Before writing code, always verify:

1.

Is this feature defined in PROJECT_PLAN.md?

2.

Does DESIGN_SYSTEM.md already define the UI?

3.

Can an existing component be reused?

4.

Is there a simpler implementation?

If uncertain,

ask before implementing.

---

# Success Criteria

Every implementation should satisfy:

✓ follows PROJECT_PLAN.md

✓ follows DESIGN_SYSTEM.md

✓ supports GS25 store owners

✓ simple

✓ reusable

✓ readable

✓ production-quality

Build software that helps people make better decisions,

not software that makes decisions for them.

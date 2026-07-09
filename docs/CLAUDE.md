# GRADPLAN Agent Context

## Project Overview
GRADPLAN is a graduation planning web service for Computer Science students.
It helps users check graduation requirements, completed credits, required categories, and future course plans.

## Tech Stack
- Frontend: React with Vite
- Backend: Express.js
- Data: Mock data first
- Styling: Plain CSS first
- Package Manager: npm

## Directory Structure
- client/: React frontend
- server/: Express backend
- docs/: planning and documentation files

## MVP Scope
1. Show graduation requirement progress
2. Let users add completed or planned courses
3. Calculate total credits, major credits, general education credits, and special requirement credits
4. Display missing requirements clearly

## Development Rules
- Do not implement unnecessary features before MVP is complete.
- Keep components small and readable.
- Separate UI, data, and calculation logic.
- Use mock data before connecting real APIs.
- Do not hard-code graduation logic inside JSX.
- Write clear commit messages using Conventional Commits.

## Commit Convention
Use this format:

type: description

Examples:
- feat: add course basket UI
- fix: correct major credit calculation
- docs: add development environment guide
- refactor: separate graduation calculation logic
- chore: initialize project structure

## Current Priority
Set up the development environment and prepare the project structure before full implementation in week 2.
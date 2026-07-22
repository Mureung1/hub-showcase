#!/usr/bin/env bash
# 최소 검증 하네스. 작업 시작/종료 시 실행해 baseline이 green인지 확인한다.
# 테스트가 생기면 이 스크립트에 단계를 추가한다 (예: npm test).
set -euo pipefail

echo "▶ lint"
npm run lint

echo "▶ build"
npm run build

echo "✓ verify 통과"

// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseReadme } from './readmeParser.js';

describe('parseReadme', () => {
  it('5개 항목이 모두 명확한 헤딩으로 있으면 전부 추출된다', () => {
    const content = `# 프로젝트 소개

온라인 쇼핑몰 주문 서비스입니다.

## 문제 정의

기존 주문 시스템은 동시성 문제가 있었습니다.

## 개발 기간

2024.01 ~ 2024.03

## 팀 구성

3인 팀, 백엔드 담당

## 주요 기능

- 회원 관리
- 상품 조회
- 주문 처리
`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('온라인 쇼핑몰 주문 서비스입니다.');
    expect(result.problem_to_solve).toBe('기존 주문 시스템은 동시성 문제가 있었습니다.');
    expect(result.duration).toBe('2024.01 ~ 2024.03');
    expect(result.team_and_role).toBe('3인 팀, 백엔드 담당');
    expect(result.key_features).toEqual(['회원 관리', '상품 조회', '주문 처리']);
  });

  it('일부 항목만 있으면 나머지는 빈 값으로 남는다 (항목 단위 실패 허용)', () => {
    const content = `## 개요

간단한 프로젝트입니다.

## 개발 기간

2024.05
`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('간단한 프로젝트입니다.');
    expect(result.duration).toBe('2024.05');
    expect(result.problem_to_solve).toBe('');
    expect(result.team_and_role).toBe('');
    expect(result.key_features).toEqual([]);
  });

  it('"배경" 헤딩은 problem_to_solve에 매핑된다', () => {
    const content = `## 배경

기존 시스템은 이런 문제가 있었습니다.
`;
    const result = parseReadme(content);
    expect(result.problem_to_solve).toBe('기존 시스템은 이런 문제가 있었습니다.');
    expect(result.service_description).toBe('');
  });

  it('영문 헤딩(Overview, Team)도 인식한다', () => {
    const content = `## Overview

This service solves problem A.

## Team

Solo developer.
`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('This service solves problem A.');
    expect(result.team_and_role).toBe('Solo developer.');
  });

  it('키워드가 헤딩 텍스트에 부분 포함되어도 매칭된다', () => {
    const content = `## 프로젝트 개요 및 목적

부분 포함 매칭 테스트.
`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('부분 포함 매칭 테스트.');
  });

  it('같은 항목에 매칭되는 헤딩이 여러 개면 먼저 나오는 것만 사용한다', () => {
    const content = `## 개요

첫 번째 개요.

## 프로젝트 소개

두 번째로 매칭되는 헤딩(무시되어야 함).
`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('첫 번째 개요.');
  });

  it('key_features는 -, *, 숫자. 마커를 모두 배열로 파싱한다', () => {
    const content = `## 주요 기능

- 대시보드
* 알림 기능
1. 결제 연동
`;
    const result = parseReadme(content);
    expect(result.key_features).toEqual(['대시보드', '알림 기능', '결제 연동']);
  });

  it('key_features 섹션에 리스트 문법이 없으면 빈 배열이다', () => {
    const content = `## 주요 기능

회원 관리, 상품 조회, 주문 처리
`;
    const result = parseReadme(content);
    expect(result.key_features).toEqual([]);
  });

  it('헤딩이 하나도 없으면 5개 항목 전부 빈 값이다', () => {
    const content = `그냥 평범한 텍스트입니다. 헤딩이 없습니다.`;
    const result = parseReadme(content);
    expect(result.service_description).toBe('');
    expect(result.problem_to_solve).toBe('');
    expect(result.duration).toBe('');
    expect(result.team_and_role).toBe('');
    expect(result.key_features).toEqual([]);
  });
});

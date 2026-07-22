import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('프로젝트 목록', () => {
  it('수집한 프로젝트를 카드에 표시한다', () => {
    render(
      <App
        projects={[
          {
            id: 'dashboard-showcase-test',
            title: 'GitHub Pages 수집 시험',
            summary: '원격 브랜치 자료를 읽어 카드에 표시합니다.',
            category: '대학 생활',
            featureTags: ['수집', '검색'],
            techStack: ['React', 'GitHub Actions'],
            githubUser: 'dashboard-test',
            thumbnailUrl: '/showcases/test/thumbnail.webp',
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'GitHub Pages 수집 시험' })).toBeInTheDocument();
    expect(screen.getByText('대학 생활')).toBeInTheDocument();
  });

  it('썸네일 높이를 카드 너비에 맞춰 계산한다', () => {
    render(
      <App
        projects={[
          {
            id: 'test',
            title: '시험 프로젝트',
            summary: '시험 설명',
            category: '대학 생활',
            featureTags: [],
            techStack: [],
            githubUser: 'student',
            thumbnailUrl: '/thumbnail.webp',
          },
        ]}
      />,
    );

    const thumbnail = screen.getByRole('img', { name: '시험 프로젝트 대표 화면' });
    expect(thumbnail).not.toHaveAttribute('height');
  });

  it('더미 프로젝트를 카드 상단에 표시한다', () => {
    render(
      <App
        projects={[
          {
            id: 'dummy-01',
            title: '화면 확인용 프로젝트 01',
            summary: '카드 배치를 확인하기 위한 더미 자료입니다.',
            category: '예시 자료',
            featureTags: [],
            techStack: [],
            githubUser: 'dummy-01',
            thumbnailUrl: '/thumbnail.webp',
            isDummy: true,
          },
        ]}
      />,
    );

    expect(screen.getByText('더미')).toBeInTheDocument();
  });

  it('상세 정보가 없으면 빈 구역과 링크를 만들지 않는다', () => {
    render(
      <App
        projects={[{
          id: 'partial',
          title: '정보가 적은 프로젝트',
          summary: '기본 정보만 있습니다.',
          category: '대학 생활',
          featureTags: [],
          techStack: [],
          githubUser: 'student',
          thumbnailUrl: '/thumbnail.webp',
        }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '정보가 적은 프로젝트 상세 보기' }));

    expect(screen.queryByRole('heading', { name: '해결하려는 문제' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

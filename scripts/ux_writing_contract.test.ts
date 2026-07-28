import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const USER_FACING_FILES = [
  'src/app/app.tsx',
  'src/app/authenticated_workspace.tsx',
  'src/features/auth/model/auth_callback_error.ts',
  'src/features/auth/model/auth_provider.tsx',
  'src/features/auth/ui/account_menu.tsx',
  'src/pages/landing/ui/landing_page.tsx',
  'src/pages/landing/ui/onboarding_feature_tabs.tsx',
  'src/pages/login/ui/login_page.tsx',
  'src/pages/save/ui/save_page.tsx',
  'src/features/android-share/model/android_share_session.ts',
  'src/features/android-share/model/use_android_share.ts',
  'src/features/android-share/ui/android_share_screen.tsx',
  'src/features/pwa-install/ui/pwa_install_notice.tsx',
  'src/shared/capacitor/mobile_oauth.ts',
  'extension/manifest.ts',
  'extension/memo.html',
  'extension/src/background.ts',
  'extension/src/memo.ts',
  'src/pages/home/ui/home_page.tsx',
  'src/pages/home/ui/retrieve_results.tsx',
  'src/pages/home/ui/retrieve_search_panel.tsx',
  'src/pages/library/ui/library_page.tsx',
  'src/features/category-management/ui/category_manager.tsx',
  'src/entities/insight/ui/insight_card.tsx',
  'src/features/insight-import/ui/insight_import_dialog.tsx',
  'src/features/insight-import/ui/insight_import_source_selector.tsx',
  'src/features/insight-import/ui/import_field_mapping.tsx',
  'src/features/insight-import/ui/import_preview.tsx',
  'src/features/insight-import/ui/import_history.tsx',
  'src/features/insight-import/model/use_insight_import.ts',
  'src/features/insight-import/model/use_notion_import.ts',
] as const;

const FORBIDDEN_PATTERNS = [
  { label: '하십시오체', pattern: /습니다/u },
  { label: '명령형 경어', pattern: /하십시오/u },
  { label: '잘못 붙인 보조 용언', pattern: /해주세요/u },
  { label: '비표준 준말', pattern: /되어요/u },
  { label: '긴 주소 용어', pattern: /원문 URL/u },
  { label: '중복 주소 용어', pattern: /링크 URL/u },
  { label: '카테고리 용어 충돌', pattern: /(?<!미)분류/u },
  { label: '명사형 저장 상태', pattern: /저장됨/u },
  {
    label: '모호한 다이얼로그 닫기',
    pattern: /(?:>\s*취소\s*<|(?:aria-label|title)\s*=\s*["']취소["'])/u,
  },
] as const;

function userFacingSource(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '')
    .replace(/throw new Error\([\s\S]*?\);/gu, '')
    .replace(/new DOMException\([\s\S]*?\)/gu, '');
}

function findViolations(source: string) {
  const userCopy = userFacingSource(source);
  return FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(userCopy)).map(
    ({ label }) => label
  );
}

describe('제품 UX Writing 계약', () => {
  it('금지 문체와 모호한 닫기 행동을 찾는다', () => {
    expect(
      findViolations(
        '<button>취소</button><button aria-label="취소" title="취소"></button> 저장했습니다. 저장됨 링크 URL'
      )
    ).toEqual([
      '하십시오체',
      '중복 주소 용어',
      '명사형 저장 상태',
      '모호한 다이얼로그 닫기',
    ]);
  });

  it('해요체와 구체적인 닫기 행동을 허용한다', () => {
    expect(
      findViolations('<button>닫기</button> 인사이트를 저장했어요.')
    ).toEqual([]);
  });

  it('사용자 노출 파일의 문구를 지킨다', () => {
    const violations = USER_FACING_FILES.flatMap((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      return findViolations(source).map(
        (violation) => `${filePath}: ${violation}`
      );
    });

    expect(violations).toEqual([]);
  });
});

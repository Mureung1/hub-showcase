import { describe, expect, it } from 'vitest';

import { findClientBundleSecrets } from './verify_client_bundle';

describe('클라이언트 번들 비밀값 검사', () => {
  it.each([
    ['const key="sb_secret_private-value";', 'Supabase secret key'],
    [
      'const key="header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";',
      'Supabase service_role JWT',
    ],
  ])('Supabase 비밀값 형식을 찾는다', (source, label) => {
    expect(findClientBundleSecrets(source)).toContain(label);
  });

  it('공개 키와 검증용 문자열은 비밀값으로 판단하지 않는다', () => {
    expect(
      findClientBundleSecrets(
        'const key="sb_publishable_public-value"; const role="service_role";'
      )
    ).toEqual([]);
  });
});

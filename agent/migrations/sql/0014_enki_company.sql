-- 엔키화이트햇을 백엔드 데이터셋의 회사 카탈로그에 더한다.
-- 보안 플랫폼 제품(ASM, PTaaS)을 기업 고객에게 제공하므로 b2b_saas 다.

INSERT INTO companies (company_id, display_name, careers_url) VALUES
  ('co_enkiwhitehat', '주식회사 엔키화이트햇', 'https://enki.career.greetinghr.com/')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_cluster_memberships
  (membership_id, company_id, cluster_id, valid_from, valid_to, assigned_by) VALUES
  ('mem_enkiwhitehat_saas', 'co_enkiwhitehat', 'b2b_saas', '2024-01-01', NULL, 'operator')
ON CONFLICT (membership_id) DO NOTHING;

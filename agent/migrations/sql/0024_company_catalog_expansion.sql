-- 회사 카탈로그를 아홉 직무 데이터셋 규모로 넓힌다.
-- 기존 24개는 백엔드 매니페스트가 참조하는 법인이라 아홉 직무의 공고를 담기에 모자란다.
-- CONTRACT 부록 A 의 18개를 더한다. 기존 행은 건드리지 않고 ON CONFLICT DO NOTHING 이다.
-- 기업군 소속은 사람이 정한 태그이며 valid_from 은 기간 축 하한인 2024-01-01 이다.

INSERT INTO companies (company_id, display_name, careers_url) VALUES
  ('co_naver',      '네이버',         'https://recruit.navercorp.com/'),
  ('co_kakao',      '카카오',         'https://careers.kakao.com/'),
  ('co_coupang',    '쿠팡',           'https://www.coupang.jobs/kr/'),
  ('co_lineplus',   '라인플러스',      'https://careers.linecorp.com/'),
  ('co_musinsa',    '무신사',         'https://corp.musinsa.com/'),
  ('co_viva',       '비바리퍼블리카',   'https://toss.im/career'),
  ('co_kakaobank',  '카카오뱅크',      'https://recruit.kakaobank.com/'),
  ('co_kbank',      '케이뱅크',        'https://www.kbanknow.com/'),
  ('co_ncsoft',     '엔씨소프트',      'https://careers.ncsoft.com/'),
  ('co_krafton',    '크래프톤',        'https://careers.krafton.com/'),
  ('co_smilegate',  '스마일게이트',     'https://careers.smilegate.com/'),
  ('co_samsungsds', '삼성에스디에스',   'https://www.samsungsds.com/kr/index.html'),
  ('co_skcnc',      '에스케이씨앤씨',   'https://www.skcc.co.kr/'),
  ('co_poscodx',    '포스코디엑스',     'https://www.poscodx.com/'),
  ('co_navercloud', '네이버클라우드',   'https://www.ncloud.com/'),
  ('co_sendbird',   '센드버드',        'https://sendbird.com/careers'),
  ('co_upstage',    '업스테이지',      'https://www.upstage.ai/careers'),
  ('co_wantedlab',  '원티드랩',        'https://www.wanted.co.kr/')
ON CONFLICT (company_id) DO NOTHING;

-- careers_url 은 문자열로만 담는다. 이 migration 은 어떤 주소에도 접속하지 않는다.
-- 비바리퍼블리카의 식별자는 법인명을 따라 co_viva 다. co_toss 를 쓰지 않는다.

INSERT INTO company_cluster_memberships
  (membership_id, company_id, cluster_id, valid_from, valid_to, assigned_by) VALUES
  ('mem_naver_bigtech',      'co_naver',      'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_kakao_bigtech',      'co_kakao',      'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_coupang_bigtech',    'co_coupang',    'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_lineplus_bigtech',   'co_lineplus',   'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_musinsa_bigtech',    'co_musinsa',    'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_viva_fintech',       'co_viva',       'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_kakaobank_fintech',  'co_kakaobank',  'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_kbank_fintech',      'co_kbank',      'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_ncsoft_game',        'co_ncsoft',     'game',             '2024-01-01', NULL, 'operator'),
  ('mem_krafton_game',       'co_krafton',    'game',             '2024-01-01', NULL, 'operator'),
  ('mem_smilegate_game',     'co_smilegate',  'game',             '2024-01-01', NULL, 'operator'),
  ('mem_samsungsds_si',      'co_samsungsds', 'si_enterprise',    '2024-01-01', NULL, 'operator'),
  ('mem_skcnc_si',           'co_skcnc',      'si_enterprise',    '2024-01-01', NULL, 'operator'),
  ('mem_poscodx_si',         'co_poscodx',    'si_enterprise',    '2024-01-01', NULL, 'operator'),
  ('mem_navercloud_saas',    'co_navercloud', 'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_sendbird_saas',      'co_sendbird',   'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_upstage_startup',    'co_upstage',    'startup',          '2024-01-01', NULL, 'operator'),
  ('mem_wantedlab_startup',  'co_wantedlab',  'startup',          '2024-01-01', NULL, 'operator')
ON CONFLICT (membership_id) DO NOTHING;

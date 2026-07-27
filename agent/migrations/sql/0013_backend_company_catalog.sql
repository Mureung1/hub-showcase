-- 백엔드 데이터셋이 참조하는 회사와 기업군 소속.
-- 수집 매니페스트 agent/data/manifest/backend.json 의 company_id 전량이 여기 있어야
-- sources.company_id 외래키가 성립한다.
-- 기업군은 사람이 정한 태그이며 자동 분류는 EXT-05 에서 다룬다.
-- 같은 채용 호스트를 쓰더라도 법인이 다르면 별도 행이다. 기업군 성향 지표의 분모가
-- 법인 단위이기 때문이다.

INSERT INTO companies (company_id, display_name, careers_url) VALUES
  ('co_autoever',        '현대오토에버',        'https://career.hyundai-autoever.com/'),
  ('co_bucketplace',     '주식회사 버킷플레이스',  'https://bucketplace.career.greetinghr.com/'),
  ('co_channelcorp',     '주식회사 채널코퍼레이션', 'https://channel.io/kr/careers'),
  ('co_daangn',          '주식회사 당근마켓',     'https://careers.daangn.com/'),
  ('co_daangnpay',       '당근페이 주식회사',     'https://careers.daangn.com/'),
  ('co_estgames',        '이스트게임즈',        'https://estfamily.career.greetinghr.com/'),
  ('co_estsecurity',     '이스트시큐리티',       'https://estfamily.career.greetinghr.com/'),
  ('co_gowid',           '고위드',            'https://gowid.career.greetinghr.com/'),
  ('co_kakaomobility',   '카카오모빌리티',       'https://kakaomobility.career.greetinghr.com/'),
  ('co_kakaopay',        '카카오페이',         'https://kakaopay.career.greetinghr.com/'),
  ('co_kurly',           '컬리',              'https://kurly.career.greetinghr.com/'),
  ('co_lgcns',           '엘지씨엔에스',        'https://careers.lg.com/'),
  ('co_linepayplus',     '라인페이플러스',       'https://careers.linecorp.com/'),
  ('co_mintrocket',      '민트로켓',           'https://careers.nexon.com/'),
  ('co_miridih',         '주식회사 미리디',      'https://www.miridih.com/'),
  ('co_neople',          '네오플',            'https://careers.nexon.com/'),
  ('co_nexonkorea',      '넥슨코리아',          'https://careers.nexon.com/'),
  ('co_nudgehealthcare', '넛지헬스케어',        'https://cashwalk12.career.greetinghr.com/'),
  ('co_qmit',            '큐엠아이티',          'https://qmit.career.greetinghr.com/'),
  ('co_supercent',       '슈퍼센트',           'https://supercent.career.greetinghr.com/'),
  ('co_travelwallet',    '트래블월렛',          'https://travel-wallet.career.greetinghr.com/'),
  ('co_woowahan',        '주식회사 우아한형제들',  'https://career.woowahan.com/'),
  ('co_zimssa',          '짐싸',              'https://zimssa.career.greetinghr.com/')
ON CONFLICT (company_id) DO NOTHING;

-- 소속의 하한은 기간 축의 하한과 맞춘다. y2024_2025 의 공고도 같은 기업군으로 해석된다.
-- valid_to 가 NULL 이면 현재까지 유효하다.
INSERT INTO company_cluster_memberships
  (membership_id, company_id, cluster_id, valid_from, valid_to, assigned_by) VALUES
  ('mem_autoever_si',              'co_autoever',        'si_enterprise',    '2024-01-01', NULL, 'operator'),
  ('mem_bucketplace_startup',      'co_bucketplace',     'startup',          '2024-01-01', NULL, 'operator'),
  ('mem_channelcorp_saas',         'co_channelcorp',     'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_daangn_startup',           'co_daangn',          'startup',          '2024-01-01', NULL, 'operator'),
  ('mem_daangnpay_fintech',        'co_daangnpay',       'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_estgames_game',            'co_estgames',        'game',             '2024-01-01', NULL, 'operator'),
  ('mem_estsecurity_saas',         'co_estsecurity',     'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_gowid_saas',               'co_gowid',           'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_kakaomobility_bigtech',    'co_kakaomobility',   'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_kakaopay_fintech',         'co_kakaopay',        'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_kurly_bigtech',            'co_kurly',           'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_lgcns_si',                 'co_lgcns',           'si_enterprise',    '2024-01-01', NULL, 'operator'),
  ('mem_linepayplus_fintech',      'co_linepayplus',     'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_mintrocket_game',          'co_mintrocket',      'game',             '2024-01-01', NULL, 'operator'),
  ('mem_miridih_saas',             'co_miridih',         'b2b_saas',         '2024-01-01', NULL, 'operator'),
  ('mem_neople_game',              'co_neople',          'game',             '2024-01-01', NULL, 'operator'),
  ('mem_nexonkorea_game',          'co_nexonkorea',      'game',             '2024-01-01', NULL, 'operator'),
  ('mem_nudgehealthcare_startup',  'co_nudgehealthcare', 'startup',          '2024-01-01', NULL, 'operator'),
  ('mem_qmit_startup',             'co_qmit',            'startup',          '2024-01-01', NULL, 'operator'),
  ('mem_supercent_game',           'co_supercent',       'game',             '2024-01-01', NULL, 'operator'),
  ('mem_travelwallet_fintech',     'co_travelwallet',    'fintech_finance',  '2024-01-01', NULL, 'operator'),
  ('mem_woowahan_bigtech',         'co_woowahan',        'bigtech_platform', '2024-01-01', NULL, 'operator'),
  ('mem_zimssa_startup',           'co_zimssa',          'startup',          '2024-01-01', NULL, 'operator')
ON CONFLICT (membership_id) DO NOTHING;

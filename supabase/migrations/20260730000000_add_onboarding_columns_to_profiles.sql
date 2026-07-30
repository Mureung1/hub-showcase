-- profiles: 멘티 온보딩 코치마크 열람 여부를 서버에서도 판단할 수 있도록 완료 시각 저장
alter table profiles
  add column mentor_list_onboarded_at timestamptz null,
  add column questionnaire_onboarded_at timestamptz null;

-- profiles: 실제로 사용되는 곳이 없어 닉네임 필드를 완전히 제거한다
alter table profiles
  drop column nickname;

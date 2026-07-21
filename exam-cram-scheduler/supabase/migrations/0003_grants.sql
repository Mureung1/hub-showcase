-- #14 후속 수정: "Automatically expose new tables"를 꺼둔 상태라, RLS 정책만으로는
-- 부족하고 anon/authenticated 역할한테 SELECT 권한(GRANT) 자체를 별도로 줘야 한다.
-- (0001에서 빠뜨렸던 부분 — permission denied 에러로 확인됨.)
grant select on caffeine_reference to anon, authenticated;
grant select on sensitivity_halflife to anon, authenticated;
grant select on safety_limits to anon, authenticated;

alter table interests add column display_order smallint not null unique;

insert into interests (name, display_order) values
  ('AI', 1),
  ('IT·개발', 2),
  ('커리어·취업', 3),
  ('자기계발', 4),
  ('시사이슈', 5),
  ('경제', 6),
  ('재테크·투자', 7),
  ('창업·스타트업', 8),
  ('심리', 9),
  ('러닝', 10),
  ('사회문제', 11),
  ('환경·ESG', 12),
  ('과학', 13),
  ('마케팅', 14),
  ('여행', 15),
  ('철학', 16),
  ('역사', 17),
  ('영화·드라마', 18),
  ('음악', 19),
  ('교육·학습법', 20);

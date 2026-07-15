alter table interests enable row level security;
alter table articles enable row level security;
alter table article_interests enable row level security;

create policy "공개 읽기" on interests for select using (true);
create policy "공개 읽기" on articles for select using (true);
create policy "공개 읽기" on article_interests for select using (true);

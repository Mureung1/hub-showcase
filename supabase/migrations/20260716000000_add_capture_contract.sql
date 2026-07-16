alter table public.insights
add column title_origin text not null default 'fallback'
  check (title_origin in ('capture', 'fallback', 'metadata', 'user'));

alter table public.insights
add constraint insights_original_url_length_check
  check (char_length(original_url) <= 4096),
add constraint insights_normalized_url_length_check
  check (char_length(normalized_url) <= 4096),
add constraint insights_domain_length_check
  check (char_length(domain) <= 253),
add constraint insights_title_length_check
  check (char_length(title) <= 500),
add constraint insights_memo_length_check
  check (memo is null or char_length(memo) <= 200),
add constraint insights_category_length_check
  check (category is null or char_length(category) <= 50);

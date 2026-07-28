-- vocabulary.excerpt: 플래시카드 뒷면에 노출할, term이 등장한 원문 발췌 문장(nullable)
-- vocabulary.excerpt_translation: 위 excerpt의 한국어 번역(nullable)
alter table public.vocabulary
  add column if not exists excerpt text,
  add column if not exists excerpt_translation text;

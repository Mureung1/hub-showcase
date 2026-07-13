CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  api_rcp_seq text NULL,
  title text NOT NULL,
  image_url text NULL,
  ingredients_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  level text NULL,
  time text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_api_rcp_seq_key UNIQUE (api_rcp_seq)
);

-- RLS (Row Level Security) 설정 (프론트엔드 직접 접근 방지 및 백엔드 service_role 허용)
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;

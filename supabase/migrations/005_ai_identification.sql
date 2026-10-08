-- designID 005: keep what the AI suggested, so we can measure how often it gets it right
alter table public.items add column if not exists ai_result jsonb;          -- description + ranked suggestions
alter table public.items add column if not exists ai_pick_rank int;         -- 1-3 = picked that suggestion, null = searched manually

-- posts 테이블(1개) + 공개 읽기 정책
create table if not exists public.posts (
id uuid primary key default gen_random_uuid(),
title text not null,
cover_image_url text not null,
body text,
meta jsonb not null default '{}'::jsonb,
published boolean not null default true,
created_at timestamptz not null default now()
);


alter table public.posts enable row level security;
create policy if not exists "public read posts" on public.posts
for select to public using (published = true);


-- 예시 데이터
insert into public.posts (title, cover_image_url, body, meta) values (
'A 코디',
'https://images.unsplash.com/photo-1512436991641-6745cdb1723f',
'여름 캐주얼 코디',
jsonb_build_object(
'products', jsonb_build_array(
jsonb_build_object(
'name','화이트 티셔츠',
'brand','Uniqlo',
'price',14900,
'currency','KRW',
'external_url','https://example.com/p1',
'image_url','https://images.unsplash.com/photo-1521572267360-ee0c2909d518'
),
jsonb_build_object(
'name','데님 팬츠',
'brand','Levi\'s',
'price',89000,
'currency','KRW',
'external_url','https://example.com/p2',
'image_url','https://images.unsplash.com/photo-1519741497674-611481863552'
)
)
)
);
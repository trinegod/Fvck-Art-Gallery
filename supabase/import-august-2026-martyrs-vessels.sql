-- Adds the Martyrs and Vessels worlds.
-- Safe to rerun: collection and artwork IDs are deterministic.

begin;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Martyrs',
  'martyrs',
  'An aggressive fashion editorial of masks, monuments, ritual spaces, and bodies refusing clean resolution.',
  'World 017',
  17
)
on conflict (id) do update set
  owner_id = excluded.owner_id,
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Vessels',
  'vessels',
  'Bonsai scenes, botanical close-ups, and a tea ritual portrait shaped by rain, glass, restraint, and cultivated stillness.',
  'World 018',
  18
)
on conflict (id) do update set
  owner_id = excluded.owner_id,
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '545f53de-373b-5eea-a55d-fc8fafbbd706',
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  'Martyrs',
  '/art/martyrs-001.webp',
  '/thumbs/martyrs-001.webp',
  'image',
  'Aggressive dark fashion editorial',
  array['martyrs', 'fashion-editorial', 'dark-fashion', 'anime', 'ai-art']::text[],
  1
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '8326d6f7-dab2-5107-a0c0-600da031809e',
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  'Persona',
  '/art/martyrs-002.webp',
  '/thumbs/martyrs-002.webp',
  'image',
  'Aggressive dark fashion editorial',
  array['martyrs', 'fashion-editorial', 'dark-fashion', 'anime', 'ai-art']::text[],
  2
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '8af8e649-edbb-5bba-916c-45360848a807',
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  'Unfinished',
  '/art/martyrs-003.webp',
  '/thumbs/martyrs-003.webp',
  'image',
  'Aggressive dark fashion editorial',
  array['martyrs', 'fashion-editorial', 'dark-fashion', 'anime', 'ai-art']::text[],
  3
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '8d6e98c1-4568-5702-83c6-4926a2af2320',
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  'Below',
  '/art/martyrs-004.webp',
  '/thumbs/martyrs-004.webp',
  'image',
  'Aggressive dark fashion editorial',
  array['martyrs', 'fashion-editorial', 'dark-fashion', 'anime', 'ai-art']::text[],
  4
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'fcb0cb0c-7a78-5b0e-ab73-5367a31f67ce',
  'a9f84c3f-d229-54e4-a6d3-a19442e803c0',
  'Evidence',
  '/art/martyrs-005.webp',
  '/thumbs/martyrs-005.webp',
  'image',
  'Aggressive dark fashion editorial',
  array['martyrs', 'fashion-editorial', 'dark-fashion', 'anime', 'ai-art']::text[],
  5
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '377e0a4c-d03c-58ba-9260-88e87d818f7a',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Herald',
  '/art/vessels-001.webp',
  '/thumbs/vessels-001.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  1
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'bae383c5-a983-5e40-8f9d-801c7a42e81b',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Herald, Blossom Detail',
  '/art/vessels-002.webp',
  '/thumbs/vessels-002.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  2
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '4b012d3f-add5-54b6-b986-44ed7f1c4a1b',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Guardian',
  '/art/vessels-003.webp',
  '/thumbs/vessels-003.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  3
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'e041e552-fc08-5352-99cb-6be4565bbb52',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Guardian, Needle Detail',
  '/art/vessels-004.webp',
  '/thumbs/vessels-004.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  4
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '2974392e-47f3-5779-966f-f54192baf09f',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Pilgrim',
  '/art/vessels-005.webp',
  '/thumbs/vessels-005.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  5
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '35d34dfb-e277-5ae5-ac71-bdcdfb8cbe54',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Pilgrim, Needle Detail',
  '/art/vessels-006.webp',
  '/thumbs/vessels-006.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  6
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '2571b6a7-caea-5d2a-b0a5-803cf25440e5',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Descender',
  '/art/vessels-007.webp',
  '/thumbs/vessels-007.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  7
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '3a96180b-8d08-5675-b1bf-351eadfbc3d7',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Descender, Needle Detail',
  '/art/vessels-008.webp',
  '/thumbs/vessels-008.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  8
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '7756d27b-31e3-5a74-9d43-83d5d6166f6f',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Sovereign',
  '/art/vessels-009.webp',
  '/thumbs/vessels-009.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  9
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '90056dd0-c797-50b7-857b-3a829cd99a6b',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Sovereign, Leaf Detail',
  '/art/vessels-010.webp',
  '/thumbs/vessels-010.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  10
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '348cf83e-0e41-597e-bc00-fc72d8e0149a',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Oracle',
  '/art/vessels-011.webp',
  '/thumbs/vessels-011.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  11
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'c6a4d49a-b720-575e-8a77-0ee8cf829e58',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Oracle, Fruit Detail',
  '/art/vessels-012.webp',
  '/thumbs/vessels-012.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  12
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'badff023-8d89-5449-b5b9-ce82fb75ca96',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Tea Master',
  '/art/vessels-013.webp',
  '/thumbs/vessels-013.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  13
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'f5c02c68-c326-58b5-8606-9f835cb37e73',
  'eca5273b-fe3f-5ce8-af30-b85e4cd60e87',
  'Tea Master, Cup Detail',
  '/art/vessels-014.webp',
  '/thumbs/vessels-014.webp',
  'image',
  'Atmospheric bonsai and tea ritual study',
  array['vessels', 'bonsai', 'botanical', 'tea-ritual', 'ai-art']::text[],
  14
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

commit;

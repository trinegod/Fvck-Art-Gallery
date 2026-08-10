-- Generated from scripts/nodeine-drive-import-manifest.json.
-- Safe to rerun: collection and artwork IDs are deterministic.

begin;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  '8392aa6b-7b58-569a-a276-166892402039',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Ashigara',
  'ashigara',
  'A continuing Japanese folklore archive of mythic figures, masks, spirits, and modern legends.',
  'World 011',
  11
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Ashigara Sprites',
  'ashigara-sprites',
  'Graphic sprite studies translating the Ashigara folklore world into bold, game-like character forms.',
  'World 012',
  12
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Ghost in the Shell',
  'ghost-in-the-shell',
  'Cybernetic identity studies exploring synthetic bodies, urban systems, and the boundaries of the human self.',
  'World 013',
  13
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Lost Lands',
  'lost-lands',
  'Imagined territories, monumental ruins, and dreamlike landscapes from worlds without maps.',
  'World 014',
  14
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Character Study Videos',
  'character-study-videos',
  'Short-form moving portraits that turn character concepts into eight-second cinematic signals.',
  'World 015',
  15
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  '75df596f-cfa3-42ce-a335-a3580ce6172b',
  'Ukiyo-e',
  'ukiyo-e',
  'Contemporary studies inspired by ukiyo-e composition, woodblock texture, folklore, and the floating world.',
  'World 016',
  16
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '766265af-4837-5852-9b20-b028e66db9b6',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 001',
  '/art/ash-001.webp',
  '/thumbs/ash-001.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '343fa613-d303-58d4-b319-c53783fb6db9',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 002',
  '/art/ash-002.webp',
  '/thumbs/ash-002.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'fba7d74a-7553-54c7-a2eb-32070d151a86',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 003',
  '/art/ash-003.webp',
  '/thumbs/ash-003.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '81c76f03-59d4-53a3-8045-7a4ed672b83e',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 004',
  '/art/ash-004.webp',
  '/thumbs/ash-004.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '26800a3f-9d91-57d0-b01f-beaeddc1fab0',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 005',
  '/art/ash-005.webp',
  '/thumbs/ash-005.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '2b82d662-7fb1-5316-9d4a-cb438136f7b0',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 006',
  '/art/ash-006.webp',
  '/thumbs/ash-006.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '01a8429c-093b-5f59-872a-50959fecded0',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 007',
  '/art/ash-007.webp',
  '/thumbs/ash-007.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'f0a30a3e-2db4-5b63-8287-7150a3997949',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 008',
  '/art/ash-008.webp',
  '/thumbs/ash-008.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'b2614687-de33-56e8-8744-76614ee48b50',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 009',
  '/art/ash-009.webp',
  '/thumbs/ash-009.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'd66e23ca-b4c6-56eb-a7a9-939755d1b5af',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 010',
  '/art/ash-010.webp',
  '/thumbs/ash-010.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'd4e1a05f-6f94-5e12-9b1b-217bbe36c425',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 011',
  '/art/ash-011.webp',
  '/thumbs/ash-011.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '0bce4df4-942b-5964-a2ae-046419466d15',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 012',
  '/art/ash-012.webp',
  '/thumbs/ash-012.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  '5ef070a8-75a9-5531-8260-870ef7d46baf',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 013',
  '/art/ash-013.webp',
  '/thumbs/ash-013.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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
  'd8cd2dca-6707-5412-8979-b8e438ccdeb2',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 014',
  '/art/ash-014.webp',
  '/thumbs/ash-014.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
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

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '1051fd09-34ec-5c07-b337-6b955465a2e8',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 015',
  '/art/ash-015.webp',
  '/thumbs/ash-015.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  15
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
  'f901acd1-1612-5907-aaf5-3e5a25c250be',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 016',
  '/art/ash-016.webp',
  '/thumbs/ash-016.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  16
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
  '177069eb-8687-518a-822c-ba49b1c9b92f',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 017',
  '/art/ash-017.webp',
  '/thumbs/ash-017.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  17
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
  '9e145dc7-6ff5-5f41-b93e-221c1ef20d77',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 018',
  '/art/ash-018.webp',
  '/thumbs/ash-018.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  18
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
  '2d718544-37d1-565e-9f63-58bb358387b3',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 019',
  '/art/ash-019.webp',
  '/thumbs/ash-019.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  19
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
  '22886e9b-eee2-5124-8871-3fc84cd4fa5d',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 020',
  '/art/ash-020.webp',
  '/thumbs/ash-020.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  20
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
  '9788206c-65a1-5e7b-b53a-e4e9a730aec5',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 021',
  '/art/ash-021.webp',
  '/thumbs/ash-021.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  21
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
  '2ea1c50f-45b0-5835-86de-aae73e05eb39',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 022',
  '/art/ash-022.webp',
  '/thumbs/ash-022.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  22
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
  '16f1d13f-7794-5df7-a7bf-aecef9a6d126',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 023',
  '/art/ash-023.webp',
  '/thumbs/ash-023.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  23
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
  '8a4e0299-f966-5e22-9f69-ef6e09b87921',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 024',
  '/art/ash-024.webp',
  '/thumbs/ash-024.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art']::text[],
  24
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
  '4a1fdb96-dcfa-51eb-ad7b-25d724c9a31e',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 001',
  '/art/ash-sprite-001.webp',
  '/thumbs/ash-sprite-001.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  'b242a92f-e6c1-5071-a635-270c7b1ec79a',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 002',
  '/art/ash-sprite-002.webp',
  '/thumbs/ash-sprite-002.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  'fab78f5a-74ef-5e49-bf83-a551be2e58c5',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 003',
  '/art/ash-sprite-003.webp',
  '/thumbs/ash-sprite-003.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  '25defef9-8ea3-5c76-9c73-5ad2fbc67c36',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 004',
  '/art/ash-sprite-004.webp',
  '/thumbs/ash-sprite-004.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  'cdfddede-55c9-56a7-8887-2f1dd6100a9c',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 005',
  '/art/ash-sprite-005.webp',
  '/thumbs/ash-sprite-005.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  '80838be7-e222-5e1c-baa6-1bd4ce23a0d0',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 006',
  '/art/ash-sprite-006.webp',
  '/thumbs/ash-sprite-006.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art']::text[],
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
  'f33eec18-a3ff-586d-9949-2adf66e8a526',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 001',
  '/art/ghost-001.webp',
  '/thumbs/ghost-001.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '6e79aab6-9272-54e0-a2d6-56330e6f5d49',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 002',
  '/art/ghost-002.webp',
  '/thumbs/ghost-002.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  'b5550082-a876-53ad-8523-832a4e3d98c1',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 003',
  '/art/ghost-003.webp',
  '/thumbs/ghost-003.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '1a0a886b-9082-5f1d-bc0d-01d28b96a961',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 004',
  '/art/ghost-004.webp',
  '/thumbs/ghost-004.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '60e1a95b-0b32-5b0e-bcfd-9c2f85442ba0',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 005',
  '/art/ghost-005.webp',
  '/thumbs/ghost-005.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '5db3252b-0b71-52eb-991a-4834ec9c2c0c',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 006',
  '/art/ghost-006.webp',
  '/thumbs/ghost-006.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '5e631782-8b33-5e1c-8fd9-1336cb47a0a7',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 007',
  '/art/ghost-007.webp',
  '/thumbs/ghost-007.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  'e096b5cf-e2e9-5fcf-9bd7-d1df6ab327f1',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 008',
  '/art/ghost-008.webp',
  '/thumbs/ghost-008.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '3075476d-2051-5531-ac89-751599b9aa36',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 009',
  '/art/ghost-009.webp',
  '/thumbs/ghost-009.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '98f38384-13c4-5aa0-8f34-fdeaa50b93f4',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 010',
  '/art/ghost-010.webp',
  '/thumbs/ghost-010.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  '9829da15-6c44-5c3a-9550-398f63fb636d',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 011',
  '/art/ghost-011.webp',
  '/thumbs/ghost-011.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  'ba3e45a3-e067-5d3d-9e17-7a8694e0be3d',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 012',
  '/art/ghost-012.webp',
  '/thumbs/ghost-012.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  'c85e8d03-feb3-5569-b9b5-ad1dd5106c3e',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 013',
  '/art/ghost-013.webp',
  '/thumbs/ghost-013.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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
  'cc13e851-dce3-50f1-b669-1122bfbaf6f7',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 014',
  '/art/ghost-014.webp',
  '/thumbs/ghost-014.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
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

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  'ad448e8d-7f5f-528c-acd8-5f4d56774bc1',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 015',
  '/art/ghost-015.webp',
  '/thumbs/ghost-015.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  15
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
  'd7009e69-618e-51b3-a313-14e725493175',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 016',
  '/art/ghost-016.webp',
  '/thumbs/ghost-016.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  16
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
  'aeb4bc37-add1-57cd-be6c-682cab1b9343',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 017',
  '/art/ghost-017.webp',
  '/thumbs/ghost-017.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  17
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
  '4d599fbc-9111-52a0-a8da-d5f0bc1af419',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 018',
  '/art/ghost-018.webp',
  '/thumbs/ghost-018.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  18
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
  '54678666-83c7-55be-9b79-6ae9593657b7',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 019',
  '/art/ghost-019.webp',
  '/thumbs/ghost-019.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  19
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
  '66774f18-041b-5674-a88b-af279d8199d4',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 020',
  '/art/ghost-020.webp',
  '/thumbs/ghost-020.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  20
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
  '9e03d91b-342f-520e-8dea-2b31ce052042',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 021',
  '/art/ghost-021.webp',
  '/thumbs/ghost-021.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  21
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
  '093848d6-76c0-59d7-9cc8-48fd401f234b',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 022',
  '/art/ghost-022.webp',
  '/thumbs/ghost-022.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  22
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
  'a6643d98-01e0-5399-ad4d-28460fd79c1a',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 023',
  '/art/ghost-023.webp',
  '/thumbs/ghost-023.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  23
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
  'b769c37a-36cb-5bed-84fa-2b1b3dcc7cb9',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 024',
  '/art/ghost-024.webp',
  '/thumbs/ghost-024.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  24
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
  '3a2c8ec4-253d-5a35-98fd-1c13ddb275de',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 025',
  '/art/ghost-025.webp',
  '/thumbs/ghost-025.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  25
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
  'daf72752-84fc-5cd2-9a45-9c68658743af',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 026',
  '/art/ghost-026.webp',
  '/thumbs/ghost-026.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  26
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
  'd53e1ee4-493d-5493-859e-4725b9f18840',
  'd6bec6fa-c5fa-5c8f-b8b2-a36fc27b526d',
  'Ghost in the Shell 027',
  '/art/ghost-027.webp',
  '/thumbs/ghost-027.webp',
  'image',
  'Cybernetic anime identity study',
  array['ghost-in-the-shell', 'cyberpunk', 'android', 'anime', 'ai-art']::text[],
  27
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
  'c306c4ad-f7fd-52b0-90de-d870544d1f6d',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 001',
  '/art/lost-001.webp',
  '/thumbs/lost-001.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '85c066ca-f36b-5430-ad8e-a491ad4dc817',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 002',
  '/art/lost-002.webp',
  '/thumbs/lost-002.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '5742ff58-a4c9-5fdc-bce1-9bea20347889',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 003',
  '/art/lost-003.webp',
  '/thumbs/lost-003.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '17d54ed8-edc8-50ec-b80e-51e6d6e99c1b',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 004',
  '/art/lost-004.webp',
  '/thumbs/lost-004.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '4f07c89f-edec-58de-bb15-02a383ef02c6',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 005',
  '/art/lost-005.webp',
  '/thumbs/lost-005.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '3f0ed6aa-6607-5db2-8aaf-c0d3802601c1',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 006',
  '/art/lost-006.webp',
  '/thumbs/lost-006.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '656e9533-ecfa-58e8-9f83-8e45d65d53e9',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 007',
  '/art/lost-007.webp',
  '/thumbs/lost-007.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  'f5432ce2-f86c-5ad5-9e67-78567cb4d288',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 008',
  '/art/lost-008.webp',
  '/thumbs/lost-008.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  'f8886e46-2615-595b-bb30-ddf792ad78e9',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 009',
  '/art/lost-009.webp',
  '/thumbs/lost-009.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '5deb6891-e4ec-5821-9d15-f186b34d79a3',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 010',
  '/art/lost-010.webp',
  '/thumbs/lost-010.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '057b5e1c-b31f-53b8-b129-625e91f4e393',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 011',
  '/art/lost-011.webp',
  '/thumbs/lost-011.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  'e3424c96-e1de-520a-8182-71f696e181a6',
  '1cd1de2f-2d82-54e6-a374-c7a377bff0da',
  'Lost Lands 012',
  '/art/lost-012.webp',
  '/thumbs/lost-012.webp',
  'image',
  'Dreamlike speculative landscape',
  array['lost-lands', 'landscape', 'worldbuilding', 'surreal', 'ai-art']::text[],
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
  '40e1660f-3898-572a-8cb6-1483a477e0ff',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 001',
  '/video/study-001.m4v',
  '/thumbs/study-001.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '9bede2c4-3b66-5f1d-af11-98bd91b4ff58',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 002',
  '/video/study-002.m4v',
  '/thumbs/study-002.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '779fca0a-e875-59a5-9c6a-bd9fea9e1154',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 003',
  '/video/study-003.m4v',
  '/thumbs/study-003.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '193c48e2-675e-5bc8-8ff0-4aa891e7cae0',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 004',
  '/video/study-004.m4v',
  '/thumbs/study-004.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  'b2734eb1-aa1c-58e3-9d85-cb75620953b5',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 005',
  '/video/study-005.m4v',
  '/thumbs/study-005.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  'ab72188f-fd3b-5786-9a66-1cadf7637aeb',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 006',
  '/video/study-001.m4v',
  '/thumbs/study-001.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '50751892-a7b0-55ae-b59e-70fac15565af',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 007',
  '/video/study-007.m4v',
  '/thumbs/study-007.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '99a6d87a-2709-555a-999e-532b76bf72a3',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 008',
  '/video/study-008.m4v',
  '/thumbs/study-008.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '95fb6b6d-f9c7-5629-ab17-8a4acec33033',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 009',
  '/video/study-009.m4v',
  '/thumbs/study-009.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  'd4302a4b-23c0-571c-9a10-7ea1eff9848f',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 010',
  '/video/study-010.m4v',
  '/thumbs/study-010.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '5e186c8d-4491-5d32-a1f0-adc9b3395794',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 011',
  '/video/study-011.m4v',
  '/thumbs/study-011.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '74fc84c1-7bc4-5d50-9fe6-5048b541e72c',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 012',
  '/video/study-012.m4v',
  '/thumbs/study-012.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '29056e4d-fc94-502b-8d58-dc9eeef30b10',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 013',
  '/video/study-013.m4v',
  '/thumbs/study-013.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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
  '588ff35b-db7e-509f-bbdc-25096b46a319',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 014',
  '/video/study-014.m4v',
  '/thumbs/study-014.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
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

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '694738f9-8f61-5669-92b7-424c15a5073e',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 015',
  '/video/study-015.m4v',
  '/thumbs/study-015.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  15
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
  '1707cb21-bae4-52a2-b277-8a77d45d6622',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 016',
  '/video/study-016.m4v',
  '/thumbs/study-016.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  16
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
  'f9910501-5d5f-5ae0-a3bb-8067db6b1d55',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 017',
  '/video/study-017.m4v',
  '/thumbs/study-017.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  17
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
  '1e00be2b-ff69-5492-9c63-11802b5197e4',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 018',
  '/video/study-018.m4v',
  '/thumbs/study-018.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  18
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
  '00b3fe1e-32b3-5581-b7fd-e70f174b01c6',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 019',
  '/video/study-019.m4v',
  '/thumbs/study-019.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  19
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
  '3ad1a8af-f1bd-528d-8426-9ca4c871f825',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 020',
  '/video/study-020.m4v',
  '/thumbs/study-020.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  20
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
  '630fa9a5-467a-547a-98a1-f17c0354564c',
  'd0c83bf2-01f3-5f80-8be4-927f648e756d',
  'Character Study Videos 021',
  '/video/study-021.m4v',
  '/thumbs/study-021.webp',
  'video',
  'Short-form cinematic character motion',
  array['character-study', 'motion', 'video', 'animation', 'ai-art']::text[],
  21
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
  '1f2dd4f1-1310-5791-98fd-39360b2787aa',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 001',
  '/art/ukiyo-001.webp',
  '/thumbs/ukiyo-001.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '72c19d0d-92e9-54e6-8965-fa6a45230907',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 002',
  '/art/ukiyo-002.webp',
  '/thumbs/ukiyo-002.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '53447bb6-75ac-5703-b91d-26007bc5608e',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 003',
  '/art/ukiyo-003.webp',
  '/thumbs/ukiyo-003.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '0c336c78-0f1e-50b3-a049-8217a5314d0e',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 004',
  '/art/ukiyo-004.webp',
  '/thumbs/ukiyo-004.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '0e66175c-2068-56e8-a18c-e0b92952be9b',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 005',
  '/art/ukiyo-005.webp',
  '/thumbs/ukiyo-005.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '2a173459-5697-5aa5-97fa-08235bfe6b73',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 006',
  '/art/ukiyo-006.webp',
  '/thumbs/ukiyo-006.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '5797ed84-7307-5cd2-9269-9e183fd4993d',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 007',
  '/art/ukiyo-007.webp',
  '/thumbs/ukiyo-007.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '9d93c487-02e2-562b-96ec-9ab4211a44fe',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 008',
  '/art/ukiyo-008.webp',
  '/thumbs/ukiyo-008.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '5f5ad42c-8d6a-5e05-bfeb-f9f041010cf3',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 009',
  '/art/ukiyo-009.webp',
  '/thumbs/ukiyo-009.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  '77dde1de-64ee-53c4-b883-41c87602115d',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 010',
  '/art/ukiyo-010.webp',
  '/thumbs/ukiyo-010.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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
  'a9d40d4c-bd9e-52a7-b203-7a587e11117f',
  'f2557dd2-79ab-5e9c-8824-e46359216700',
  'Ukiyo-e 011',
  '/art/ukiyo-011.webp',
  '/thumbs/ukiyo-011.webp',
  'image',
  'Contemporary ukiyo-e inspired study',
  array['ukiyo-e', 'japanese-art', 'woodblock', 'folklore', 'ai-art']::text[],
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

commit;

-- Appends the August 11 Ashigara and Ashigara Sprites batches.
-- Safe to rerun: artwork IDs are deterministic.

begin;

insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  '3ee5acf3-2369-5c22-84b2-8a386ff8cacd',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 025',
  '/art/ash-025.webp',
  '/thumbs/ash-025.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
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
  '92b7df1e-c75b-5473-8394-0e203f613f39',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 026',
  '/art/ash-026.webp',
  '/thumbs/ash-026.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
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
  'e952f284-09af-5766-8055-a1d4f20d970f',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 027',
  '/art/ash-027.webp',
  '/thumbs/ash-027.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
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
  '5a05cc01-275c-5e9a-8597-ce9b7f596dd4',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 028',
  '/art/ash-028.webp',
  '/thumbs/ash-028.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  28
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
  '3dc8c930-07cf-5e38-b880-7c82fcc90a61',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 029',
  '/art/ash-029.webp',
  '/thumbs/ash-029.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  29
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
  '5ee3d50f-e0ea-518a-af0e-b04488eb4971',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 030',
  '/art/ash-030.webp',
  '/thumbs/ash-030.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  30
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
  '4787c16d-64a8-5f36-93d3-490796514bd7',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 031',
  '/art/ash-031.webp',
  '/thumbs/ash-031.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  31
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
  '248cf6b7-7688-5269-a4e8-85a70746b203',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 032',
  '/art/ash-032.webp',
  '/thumbs/ash-032.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  32
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
  'cb48f893-4a84-5fa8-b1e7-6136d818e685',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 033',
  '/art/ash-033.webp',
  '/thumbs/ash-033.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  33
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
  '76a3cb92-831d-5ce5-89b8-a6e2ed78039b',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 034',
  '/art/ash-034.webp',
  '/thumbs/ash-034.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  34
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
  '017f8c2a-5971-53a5-a706-917094741267',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 035',
  '/art/ash-035.webp',
  '/thumbs/ash-035.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  35
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
  '933d283c-b384-53b9-9d69-4051995994d4',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 036',
  '/art/ash-036.webp',
  '/thumbs/ash-036.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  36
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
  'dfbbe6b6-0f5f-595b-85d8-6368317e3912',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 037',
  '/art/ash-037.webp',
  '/thumbs/ash-037.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  37
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
  '836c8c1f-bded-5517-9701-0ff81657518a',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 038',
  '/art/ash-038.webp',
  '/thumbs/ash-038.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  38
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
  '141ab26c-337f-589e-bd91-9d5dde4271ed',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 039',
  '/art/ash-039.webp',
  '/thumbs/ash-039.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  39
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
  '76d4dc1d-c5d4-50af-b881-ef274d3ee8aa',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 040',
  '/art/ash-040.webp',
  '/thumbs/ash-040.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  40
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
  'f359c61f-3e4c-54d6-a81e-fc2d785578b1',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 041',
  '/art/ash-041.webp',
  '/thumbs/ash-041.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  41
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
  'e8689f9e-1592-5cc7-afc7-ed06927e12e4',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 042',
  '/art/ash-042.webp',
  '/thumbs/ash-042.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  42
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
  '99d8f049-3032-5d93-ac0b-cd649cc8057a',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 043',
  '/art/ash-043.webp',
  '/thumbs/ash-043.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  43
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
  'c38f4ebc-bbf7-5cc5-ab15-0cd3a85f5ab3',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 044',
  '/art/ash-044.webp',
  '/thumbs/ash-044.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  44
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
  'a94c1778-65fc-51db-81b2-23568f975216',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 045',
  '/art/ash-045.webp',
  '/thumbs/ash-045.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  45
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
  'a8cf78bd-f613-55cf-9ca0-dd26b96c7a76',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 046',
  '/art/ash-046.webp',
  '/thumbs/ash-046.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  46
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
  'ebdca564-012b-53f2-9bba-ed2e866eca92',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 047',
  '/art/ash-047.webp',
  '/thumbs/ash-047.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  47
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
  '70d49804-23d3-506d-9d3c-9a1346904a42',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 048',
  '/art/ash-048.webp',
  '/thumbs/ash-048.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  48
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
  '17b87c2a-4c85-5c48-acce-c985ac95f415',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 049',
  '/art/ash-049.webp',
  '/thumbs/ash-049.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  49
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
  '38d396dc-8942-5e68-87ea-966f52b781ea',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 050',
  '/art/ash-050.webp',
  '/thumbs/ash-050.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  50
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
  '0a6a8f59-bd61-56dc-82d5-00edd1545690',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 051',
  '/art/ash-051.webp',
  '/thumbs/ash-051.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  51
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
  '541cddba-c817-57ca-82b5-fe3667df5e44',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 052',
  '/art/ash-052.webp',
  '/thumbs/ash-052.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  52
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
  '46e4e1a0-8a7c-5390-af0b-0b4be2e50d1a',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 053',
  '/art/ash-053.webp',
  '/thumbs/ash-053.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  53
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
  'b8249c8b-9989-53ed-9d1c-4fdff27e37c8',
  '8392aa6b-7b58-569a-a276-166892402039',
  'Ashigara 054',
  '/art/ash-054.webp',
  '/thumbs/ash-054.webp',
  'image',
  'Mythic Japanese folklore character study',
  array['ashigara', 'japanese-folklore', 'yokai', 'mythology', 'ai-art' ]::text[],
  54
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
  'cd7be01c-5d7b-5784-ac3d-c79c9ec07e7a',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 007',
  '/art/ash-sprite-007.webp',
  '/thumbs/ash-sprite-007.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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
  '5296f260-c8dd-571d-8f0f-4b639dc28826',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 008',
  '/art/ash-sprite-008.webp',
  '/thumbs/ash-sprite-008.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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
  '98dec24e-ab96-5921-8c6a-60ad18873548',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 009',
  '/art/ash-sprite-009.webp',
  '/thumbs/ash-sprite-009.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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
  '5e77edd4-b7d5-58f7-83a5-a9231a90bb05',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 010',
  '/art/ash-sprite-010.webp',
  '/thumbs/ash-sprite-010.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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
  'dc47119f-4485-56d2-bbb3-922f16168a28',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 011',
  '/art/ash-sprite-011.webp',
  '/thumbs/ash-sprite-011.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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
  '319df612-0439-5dfa-be36-1b0a6848127a',
  '5b7fab4a-636b-5f4c-b07c-8446dfa789b2',
  'Ashigara Sprites 012',
  '/art/ash-sprite-012.webp',
  '/thumbs/ash-sprite-012.webp',
  'image',
  'Bold folklore sprite study',
  array['ashigara', 'sprite-art', 'japanese-folklore', 'character-design', 'ai-art' ]::text[],
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

commit;

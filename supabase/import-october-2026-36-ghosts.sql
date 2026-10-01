-- Generated from the verified 78-image Ghosts manifest.
-- Additive content only; no schema, permissions, existing worlds or messages changed.
-- Publish matching assets first. Reruns preserve owner edits.
begin;
do $$ begin
  if not exists(select 1 from public.profiles where id='75df596f-cfa3-42ce-a335-a3580ce6172b' and username='founder') then raise exception 'Expected founder is missing'; end if;
  if exists(select 1 from public.collections where (slug='36-ghosts' and id<>'3a4a3c5a-3656-5f2b-84a4-d40c671afdf1') or (id='3a4a3c5a-3656-5f2b-84a4-d40c671afdf1' and (owner_id is distinct from '75df596f-cfa3-42ce-a335-a3580ce6172b'::uuid or slug is distinct from '36-ghosts'))) then raise exception 'World identity collision'; end if;
end $$;
insert into public.collections (id,owner_id,title,slug,summary,world_code,sort_order)
values ('3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','75df596f-cfa3-42ce-a335-a3580ce6172b','(36) Ghosts','36-ghosts','Ghostly encounters, spirits and folklore, told through full compositions and close-up studies.','World 020',20)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('f71474d1-771d-5ed6-a24f-26f0df7269d7','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 001','/art/ghosts36-001.webp','/thumbs/ghosts36-001.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],1)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('818e130e-371d-5ddd-b22a-91babac81c9f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 002','/art/ghosts36-002.webp','/thumbs/ghosts36-002.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],2)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('1e312d88-b81d-5cfb-a528-8c17b04baac3','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 003','/art/ghosts36-003.webp','/thumbs/ghosts36-003.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],3)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('69613bcd-1f5f-59bd-8534-5317ac13653f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 004','/art/ghosts36-004.webp','/thumbs/ghosts36-004.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],4)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('8caf19d5-c802-5e6c-84e5-4e7e800da5ba','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 005','/art/ghosts36-005.webp','/thumbs/ghosts36-005.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],5)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('ce9ca169-3c0f-5a87-922c-7dee4e01ff8a','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 006','/art/ghosts36-006.webp','/thumbs/ghosts36-006.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],6)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('2fc5c8db-627f-557f-952b-080cbd9bf1d3','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 007','/art/ghosts36-007.webp','/thumbs/ghosts36-007.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],7)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('b46ed40d-87e0-5d45-8cea-ef245ae9fca7','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 008','/art/ghosts36-008.webp','/thumbs/ghosts36-008.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],8)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('ed4fed7b-39a0-5f32-831e-a7d95d5861aa','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 009','/art/ghosts36-009.webp','/thumbs/ghosts36-009.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],9)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('72ac0bba-3ef0-5ec4-8359-3d7716fd51df','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 010','/art/ghosts36-010.webp','/thumbs/ghosts36-010.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],10)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('ed017709-9363-5e40-a77c-a14ee01a8a10','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 011','/art/ghosts36-011.webp','/thumbs/ghosts36-011.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],11)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('11d1f4fa-4f91-5499-a30e-5de13e993947','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 012','/art/ghosts36-012.webp','/thumbs/ghosts36-012.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],12)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('0854cf13-5e44-5dac-9029-5e1b89837f65','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 013','/art/ghosts36-013.webp','/thumbs/ghosts36-013.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],13)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('3dbb52dc-b519-583c-88b6-25620b2d29cc','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 014','/art/ghosts36-014.webp','/thumbs/ghosts36-014.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],14)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('a32ae879-c54a-5efd-ba14-52268df13265','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 015','/art/ghosts36-015.webp','/thumbs/ghosts36-015.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],15)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('6b60825e-863f-5fca-a25a-3bc51969aa46','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 016','/art/ghosts36-016.webp','/thumbs/ghosts36-016.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],16)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('0402476e-7828-5cf1-a0b2-e976a6d44e18','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 017','/art/ghosts36-017.webp','/thumbs/ghosts36-017.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],17)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('bbb5353d-e482-57fc-abdb-12762c193bf6','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 018','/art/ghosts36-018.webp','/thumbs/ghosts36-018.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],18)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('1ce830f2-61b9-55a1-b97c-5d16a8bcdf27','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 019','/art/ghosts36-019.webp','/thumbs/ghosts36-019.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],19)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('3b32b0f9-97a8-5275-bcad-edd202720cf8','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 020','/art/ghosts36-020.webp','/thumbs/ghosts36-020.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],20)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('8aa2ec91-1bc4-5f5d-9a45-d12599128434','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 021','/art/ghosts36-021.webp','/thumbs/ghosts36-021.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],21)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('cfbf915f-fe4c-5c3e-b1be-46e3f6f504be','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 022','/art/ghosts36-022.webp','/thumbs/ghosts36-022.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],22)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('9145a42b-7fb2-5a72-8571-21cb8463e869','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 023','/art/ghosts36-023.webp','/thumbs/ghosts36-023.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],23)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('88d1dd63-80f4-56d4-b95e-1a538764c617','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 024','/art/ghosts36-024.webp','/thumbs/ghosts36-024.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],24)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('0dc34504-30a0-5e00-8876-f0e979243e5a','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 025','/art/ghosts36-025.webp','/thumbs/ghosts36-025.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],25)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('4edf9e56-7a97-54ae-946c-9c2f06687dce','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 026','/art/ghosts36-026.webp','/thumbs/ghosts36-026.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],26)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('ffb637ef-8bb3-5fe3-8fe3-f48bd2c4f1d9','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 027','/art/ghosts36-027.webp','/thumbs/ghosts36-027.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],27)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('b23a69f6-f621-584e-ac3e-bbe6f51a2374','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 028','/art/ghosts36-028.webp','/thumbs/ghosts36-028.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],28)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('1d9c6c5b-5262-54a9-9adc-a234175e64a1','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 029','/art/ghosts36-029.webp','/thumbs/ghosts36-029.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],29)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('437c6665-7889-5464-97f3-44cdb60149e8','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 030','/art/ghosts36-030.webp','/thumbs/ghosts36-030.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],30)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('54e91467-48ed-582f-b3a3-24e65ff6ae0f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 031','/art/ghosts36-031.webp','/thumbs/ghosts36-031.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],31)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('8038c658-0180-5ae8-b3b0-54a24ac17485','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 032','/art/ghosts36-032.webp','/thumbs/ghosts36-032.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],32)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('eb298faa-ecf9-5ca9-b188-9f1d74283947','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 033','/art/ghosts36-033.webp','/thumbs/ghosts36-033.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],33)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('07ba5519-e5c3-522e-84b8-42edb82a77a8','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 034','/art/ghosts36-034.webp','/thumbs/ghosts36-034.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],34)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('6c20c4d1-8c76-53cc-ae4b-46aee32c9f1c','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 035','/art/ghosts36-035.webp','/thumbs/ghosts36-035.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],35)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('2afa2e2f-4479-548f-84ff-417b4d931f2d','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 036','/art/ghosts36-036.webp','/thumbs/ghosts36-036.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],36)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('8f5afdbe-c056-53f7-a911-6e874052707e','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 037','/art/ghosts36-037.webp','/thumbs/ghosts36-037.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],37)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('6032f9f6-97e8-573e-9ef6-383a7062da3b','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 038','/art/ghosts36-038.webp','/thumbs/ghosts36-038.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],38)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('e3bd9cdf-02ae-558b-8486-29cff39d44a7','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 039','/art/ghosts36-039.webp','/thumbs/ghosts36-039.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],39)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('260f7529-311c-5de0-baa6-5f4bb88868a3','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 040','/art/ghosts36-040.webp','/thumbs/ghosts36-040.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],40)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('ea589007-ae5e-52f6-9358-e2a77b66bb9f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 041','/art/ghosts36-041.webp','/thumbs/ghosts36-041.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],41)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('b66030d8-a688-551b-a633-3dd3ea2c8e68','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 042','/art/ghosts36-042.webp','/thumbs/ghosts36-042.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],42)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('2b6dcbfd-f918-57d8-a5f5-e46337caaff1','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 043','/art/ghosts36-043.webp','/thumbs/ghosts36-043.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],43)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('994409d2-a029-5513-a6ab-76725f3894e1','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 044','/art/ghosts36-044.webp','/thumbs/ghosts36-044.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],44)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('25cec75b-16fe-5d1d-8f84-d636f00820c8','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 045','/art/ghosts36-045.webp','/thumbs/ghosts36-045.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],45)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('d9249689-29f0-5135-a89b-9abc976efa55','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 046','/art/ghosts36-046.webp','/thumbs/ghosts36-046.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],46)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('68ee4ae9-cf25-5fe3-9749-e4720f2a135c','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 047','/art/ghosts36-047.webp','/thumbs/ghosts36-047.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],47)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('e087040a-9cb9-5b9c-b95f-55d78799ab98','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 048','/art/ghosts36-048.webp','/thumbs/ghosts36-048.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],48)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('1571c1c4-a9b2-5848-bef9-9879f8af1247','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 049','/art/ghosts36-049.webp','/thumbs/ghosts36-049.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],49)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('b27fddd2-6b7f-549f-9dbc-36c795ac62f2','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 050','/art/ghosts36-050.webp','/thumbs/ghosts36-050.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],50)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('a3e3a922-8e54-5524-a856-3c3e90a29da0','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 051','/art/ghosts36-051.webp','/thumbs/ghosts36-051.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],51)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('c7a491b2-dd49-5fe4-90e3-2a8e84ba274a','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 052','/art/ghosts36-052.webp','/thumbs/ghosts36-052.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],52)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('e32dc1ae-a9dd-512f-8c57-0658e0feb91f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 053','/art/ghosts36-053.webp','/thumbs/ghosts36-053.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],53)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('0b21e52c-d41c-5812-9967-e49e63b2aaea','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 054','/art/ghosts36-054.webp','/thumbs/ghosts36-054.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],54)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('91b586f8-509d-53f2-b3b7-227c8f367f58','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 055','/art/ghosts36-055.webp','/thumbs/ghosts36-055.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],55)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('17521e0e-331e-595a-8394-a28ddadadb60','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 056','/art/ghosts36-056.webp','/thumbs/ghosts36-056.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],56)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('5a36b58c-c407-5429-a151-36e82969296e','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 057','/art/ghosts36-057.webp','/thumbs/ghosts36-057.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],57)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('eebe1692-55fb-5601-89f3-6ba49c3ca29f','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 058','/art/ghosts36-058.webp','/thumbs/ghosts36-058.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],58)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('9c747640-d907-51eb-b2c5-734f2d0f181c','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 059','/art/ghosts36-059.webp','/thumbs/ghosts36-059.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],59)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('a2092423-6f69-5043-958c-092b3bd7d661','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 060','/art/ghosts36-060.webp','/thumbs/ghosts36-060.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],60)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('7bfe30a3-8779-522c-9370-5558ac8f5d18','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 061','/art/ghosts36-061.webp','/thumbs/ghosts36-061.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],61)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('36a44ff2-b3af-50e8-afd8-48bfd3ce4278','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 062','/art/ghosts36-062.webp','/thumbs/ghosts36-062.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],62)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('827dd11e-2bec-5477-9f38-505b67e77bf7','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 063','/art/ghosts36-063.webp','/thumbs/ghosts36-063.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],63)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('0c2276d8-c125-5919-9a41-4c9a79a47796','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 064','/art/ghosts36-064.webp','/thumbs/ghosts36-064.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],64)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('33043a35-547c-504a-960e-e14484ba24aa','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 065','/art/ghosts36-065.webp','/thumbs/ghosts36-065.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],65)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('cb138f72-4565-5f31-b3e1-14cd7caab1bf','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 066','/art/ghosts36-066.webp','/thumbs/ghosts36-066.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],66)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('098d4511-f321-5159-bdae-4b870f1b21cf','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 067','/art/ghosts36-067.webp','/thumbs/ghosts36-067.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],67)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('73fe02da-e82c-5532-9028-14f0d129ed61','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 068','/art/ghosts36-068.webp','/thumbs/ghosts36-068.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],68)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('4194deb8-721e-5516-a308-d044814e2643','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 069','/art/ghosts36-069.webp','/thumbs/ghosts36-069.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],69)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('124d823c-a3ed-5bc2-accf-fe6d3e14871a','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 070','/art/ghosts36-070.webp','/thumbs/ghosts36-070.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],70)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('d282292a-2d1d-5ccf-9df0-e0c3ba49e913','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 071','/art/ghosts36-071.webp','/thumbs/ghosts36-071.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],71)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('35100679-242f-5596-aa2c-473d3d08ce16','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 072','/art/ghosts36-072.webp','/thumbs/ghosts36-072.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],72)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('427aec06-763c-5bd2-bc73-ac7340dc4dbf','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 073','/art/ghosts36-073.webp','/thumbs/ghosts36-073.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],73)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('bad3460d-d36c-5a09-9543-799018d2707e','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 074','/art/ghosts36-074.webp','/thumbs/ghosts36-074.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],74)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('c0c9c855-634d-5e80-8c84-510253527921','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 075','/art/ghosts36-075.webp','/thumbs/ghosts36-075.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],75)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('e0ee3d73-ab44-5335-b86c-c1c51a49be34','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 076','/art/ghosts36-076.webp','/thumbs/ghosts36-076.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],76)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('4eaf5dfd-4b66-5461-813f-bf6f44e38dda','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 077','/art/ghosts36-077.webp','/thumbs/ghosts36-077.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],77)
on conflict (id) do nothing;
insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values ('76384db3-266a-5b26-bb3a-9be68ab534c1','3a4a3c5a-3656-5f2b-84a4-d40c671afdf1','(36) Ghosts 078','/art/ghosts36-078.webp','/thumbs/ghosts36-078.webp','image','Supernatural folklore and ghost stories',array['36-ghosts','ghosts','folklore','character-study','ai-art']::text[],78)
on conflict (id) do nothing;
do $$ begin
  if (select count(*) from public.artworks where collection_id='3a4a3c5a-3656-5f2b-84a4-d40c671afdf1' and id in ('f71474d1-771d-5ed6-a24f-26f0df7269d7','818e130e-371d-5ddd-b22a-91babac81c9f','1e312d88-b81d-5cfb-a528-8c17b04baac3','69613bcd-1f5f-59bd-8534-5317ac13653f','8caf19d5-c802-5e6c-84e5-4e7e800da5ba','ce9ca169-3c0f-5a87-922c-7dee4e01ff8a','2fc5c8db-627f-557f-952b-080cbd9bf1d3','b46ed40d-87e0-5d45-8cea-ef245ae9fca7','ed4fed7b-39a0-5f32-831e-a7d95d5861aa','72ac0bba-3ef0-5ec4-8359-3d7716fd51df','ed017709-9363-5e40-a77c-a14ee01a8a10','11d1f4fa-4f91-5499-a30e-5de13e993947','0854cf13-5e44-5dac-9029-5e1b89837f65','3dbb52dc-b519-583c-88b6-25620b2d29cc','a32ae879-c54a-5efd-ba14-52268df13265','6b60825e-863f-5fca-a25a-3bc51969aa46','0402476e-7828-5cf1-a0b2-e976a6d44e18','bbb5353d-e482-57fc-abdb-12762c193bf6','1ce830f2-61b9-55a1-b97c-5d16a8bcdf27','3b32b0f9-97a8-5275-bcad-edd202720cf8','8aa2ec91-1bc4-5f5d-9a45-d12599128434','cfbf915f-fe4c-5c3e-b1be-46e3f6f504be','9145a42b-7fb2-5a72-8571-21cb8463e869','88d1dd63-80f4-56d4-b95e-1a538764c617','0dc34504-30a0-5e00-8876-f0e979243e5a','4edf9e56-7a97-54ae-946c-9c2f06687dce','ffb637ef-8bb3-5fe3-8fe3-f48bd2c4f1d9','b23a69f6-f621-584e-ac3e-bbe6f51a2374','1d9c6c5b-5262-54a9-9adc-a234175e64a1','437c6665-7889-5464-97f3-44cdb60149e8','54e91467-48ed-582f-b3a3-24e65ff6ae0f','8038c658-0180-5ae8-b3b0-54a24ac17485','eb298faa-ecf9-5ca9-b188-9f1d74283947','07ba5519-e5c3-522e-84b8-42edb82a77a8','6c20c4d1-8c76-53cc-ae4b-46aee32c9f1c','2afa2e2f-4479-548f-84ff-417b4d931f2d','8f5afdbe-c056-53f7-a911-6e874052707e','6032f9f6-97e8-573e-9ef6-383a7062da3b','e3bd9cdf-02ae-558b-8486-29cff39d44a7','260f7529-311c-5de0-baa6-5f4bb88868a3','ea589007-ae5e-52f6-9358-e2a77b66bb9f','b66030d8-a688-551b-a633-3dd3ea2c8e68','2b6dcbfd-f918-57d8-a5f5-e46337caaff1','994409d2-a029-5513-a6ab-76725f3894e1','25cec75b-16fe-5d1d-8f84-d636f00820c8','d9249689-29f0-5135-a89b-9abc976efa55','68ee4ae9-cf25-5fe3-9749-e4720f2a135c','e087040a-9cb9-5b9c-b95f-55d78799ab98','1571c1c4-a9b2-5848-bef9-9879f8af1247','b27fddd2-6b7f-549f-9dbc-36c795ac62f2','a3e3a922-8e54-5524-a856-3c3e90a29da0','c7a491b2-dd49-5fe4-90e3-2a8e84ba274a','e32dc1ae-a9dd-512f-8c57-0658e0feb91f','0b21e52c-d41c-5812-9967-e49e63b2aaea','91b586f8-509d-53f2-b3b7-227c8f367f58','17521e0e-331e-595a-8394-a28ddadadb60','5a36b58c-c407-5429-a151-36e82969296e','eebe1692-55fb-5601-89f3-6ba49c3ca29f','9c747640-d907-51eb-b2c5-734f2d0f181c','a2092423-6f69-5043-958c-092b3bd7d661','7bfe30a3-8779-522c-9370-5558ac8f5d18','36a44ff2-b3af-50e8-afd8-48bfd3ce4278','827dd11e-2bec-5477-9f38-505b67e77bf7','0c2276d8-c125-5919-9a41-4c9a79a47796','33043a35-547c-504a-960e-e14484ba24aa','cb138f72-4565-5f31-b3e1-14cd7caab1bf','098d4511-f321-5159-bdae-4b870f1b21cf','73fe02da-e82c-5532-9028-14f0d129ed61','4194deb8-721e-5516-a308-d044814e2643','124d823c-a3ed-5bc2-accf-fe6d3e14871a','d282292a-2d1d-5ccf-9df0-e0c3ba49e913','35100679-242f-5596-aa2c-473d3d08ce16','427aec06-763c-5bd2-bc73-ac7340dc4dbf','bad3460d-d36c-5a09-9543-799018d2707e','c0c9c855-634d-5e80-8c84-510253527921','e0ee3d73-ab44-5335-b86c-c1c51a49be34','4eaf5dfd-4b66-5461-813f-bf6f44e38dda','76384db3-266a-5b26-bb3a-9be68ab534c1')) <> 78 then raise exception 'Artwork identity collision'; end if;
  if exists(select 1 from (values ('f71474d1-771d-5ed6-a24f-26f0df7269d7'::uuid,'/art/ghosts36-001.webp','/thumbs/ghosts36-001.webp'),('818e130e-371d-5ddd-b22a-91babac81c9f'::uuid,'/art/ghosts36-002.webp','/thumbs/ghosts36-002.webp'),('1e312d88-b81d-5cfb-a528-8c17b04baac3'::uuid,'/art/ghosts36-003.webp','/thumbs/ghosts36-003.webp'),('69613bcd-1f5f-59bd-8534-5317ac13653f'::uuid,'/art/ghosts36-004.webp','/thumbs/ghosts36-004.webp'),('8caf19d5-c802-5e6c-84e5-4e7e800da5ba'::uuid,'/art/ghosts36-005.webp','/thumbs/ghosts36-005.webp'),('ce9ca169-3c0f-5a87-922c-7dee4e01ff8a'::uuid,'/art/ghosts36-006.webp','/thumbs/ghosts36-006.webp'),('2fc5c8db-627f-557f-952b-080cbd9bf1d3'::uuid,'/art/ghosts36-007.webp','/thumbs/ghosts36-007.webp'),('b46ed40d-87e0-5d45-8cea-ef245ae9fca7'::uuid,'/art/ghosts36-008.webp','/thumbs/ghosts36-008.webp'),('ed4fed7b-39a0-5f32-831e-a7d95d5861aa'::uuid,'/art/ghosts36-009.webp','/thumbs/ghosts36-009.webp'),('72ac0bba-3ef0-5ec4-8359-3d7716fd51df'::uuid,'/art/ghosts36-010.webp','/thumbs/ghosts36-010.webp'),('ed017709-9363-5e40-a77c-a14ee01a8a10'::uuid,'/art/ghosts36-011.webp','/thumbs/ghosts36-011.webp'),('11d1f4fa-4f91-5499-a30e-5de13e993947'::uuid,'/art/ghosts36-012.webp','/thumbs/ghosts36-012.webp'),('0854cf13-5e44-5dac-9029-5e1b89837f65'::uuid,'/art/ghosts36-013.webp','/thumbs/ghosts36-013.webp'),('3dbb52dc-b519-583c-88b6-25620b2d29cc'::uuid,'/art/ghosts36-014.webp','/thumbs/ghosts36-014.webp'),('a32ae879-c54a-5efd-ba14-52268df13265'::uuid,'/art/ghosts36-015.webp','/thumbs/ghosts36-015.webp'),('6b60825e-863f-5fca-a25a-3bc51969aa46'::uuid,'/art/ghosts36-016.webp','/thumbs/ghosts36-016.webp'),('0402476e-7828-5cf1-a0b2-e976a6d44e18'::uuid,'/art/ghosts36-017.webp','/thumbs/ghosts36-017.webp'),('bbb5353d-e482-57fc-abdb-12762c193bf6'::uuid,'/art/ghosts36-018.webp','/thumbs/ghosts36-018.webp'),('1ce830f2-61b9-55a1-b97c-5d16a8bcdf27'::uuid,'/art/ghosts36-019.webp','/thumbs/ghosts36-019.webp'),('3b32b0f9-97a8-5275-bcad-edd202720cf8'::uuid,'/art/ghosts36-020.webp','/thumbs/ghosts36-020.webp'),('8aa2ec91-1bc4-5f5d-9a45-d12599128434'::uuid,'/art/ghosts36-021.webp','/thumbs/ghosts36-021.webp'),('cfbf915f-fe4c-5c3e-b1be-46e3f6f504be'::uuid,'/art/ghosts36-022.webp','/thumbs/ghosts36-022.webp'),('9145a42b-7fb2-5a72-8571-21cb8463e869'::uuid,'/art/ghosts36-023.webp','/thumbs/ghosts36-023.webp'),('88d1dd63-80f4-56d4-b95e-1a538764c617'::uuid,'/art/ghosts36-024.webp','/thumbs/ghosts36-024.webp'),('0dc34504-30a0-5e00-8876-f0e979243e5a'::uuid,'/art/ghosts36-025.webp','/thumbs/ghosts36-025.webp'),('4edf9e56-7a97-54ae-946c-9c2f06687dce'::uuid,'/art/ghosts36-026.webp','/thumbs/ghosts36-026.webp'),('ffb637ef-8bb3-5fe3-8fe3-f48bd2c4f1d9'::uuid,'/art/ghosts36-027.webp','/thumbs/ghosts36-027.webp'),('b23a69f6-f621-584e-ac3e-bbe6f51a2374'::uuid,'/art/ghosts36-028.webp','/thumbs/ghosts36-028.webp'),('1d9c6c5b-5262-54a9-9adc-a234175e64a1'::uuid,'/art/ghosts36-029.webp','/thumbs/ghosts36-029.webp'),('437c6665-7889-5464-97f3-44cdb60149e8'::uuid,'/art/ghosts36-030.webp','/thumbs/ghosts36-030.webp'),('54e91467-48ed-582f-b3a3-24e65ff6ae0f'::uuid,'/art/ghosts36-031.webp','/thumbs/ghosts36-031.webp'),('8038c658-0180-5ae8-b3b0-54a24ac17485'::uuid,'/art/ghosts36-032.webp','/thumbs/ghosts36-032.webp'),('eb298faa-ecf9-5ca9-b188-9f1d74283947'::uuid,'/art/ghosts36-033.webp','/thumbs/ghosts36-033.webp'),('07ba5519-e5c3-522e-84b8-42edb82a77a8'::uuid,'/art/ghosts36-034.webp','/thumbs/ghosts36-034.webp'),('6c20c4d1-8c76-53cc-ae4b-46aee32c9f1c'::uuid,'/art/ghosts36-035.webp','/thumbs/ghosts36-035.webp'),('2afa2e2f-4479-548f-84ff-417b4d931f2d'::uuid,'/art/ghosts36-036.webp','/thumbs/ghosts36-036.webp'),('8f5afdbe-c056-53f7-a911-6e874052707e'::uuid,'/art/ghosts36-037.webp','/thumbs/ghosts36-037.webp'),('6032f9f6-97e8-573e-9ef6-383a7062da3b'::uuid,'/art/ghosts36-038.webp','/thumbs/ghosts36-038.webp'),('e3bd9cdf-02ae-558b-8486-29cff39d44a7'::uuid,'/art/ghosts36-039.webp','/thumbs/ghosts36-039.webp'),('260f7529-311c-5de0-baa6-5f4bb88868a3'::uuid,'/art/ghosts36-040.webp','/thumbs/ghosts36-040.webp'),('ea589007-ae5e-52f6-9358-e2a77b66bb9f'::uuid,'/art/ghosts36-041.webp','/thumbs/ghosts36-041.webp'),('b66030d8-a688-551b-a633-3dd3ea2c8e68'::uuid,'/art/ghosts36-042.webp','/thumbs/ghosts36-042.webp'),('2b6dcbfd-f918-57d8-a5f5-e46337caaff1'::uuid,'/art/ghosts36-043.webp','/thumbs/ghosts36-043.webp'),('994409d2-a029-5513-a6ab-76725f3894e1'::uuid,'/art/ghosts36-044.webp','/thumbs/ghosts36-044.webp'),('25cec75b-16fe-5d1d-8f84-d636f00820c8'::uuid,'/art/ghosts36-045.webp','/thumbs/ghosts36-045.webp'),('d9249689-29f0-5135-a89b-9abc976efa55'::uuid,'/art/ghosts36-046.webp','/thumbs/ghosts36-046.webp'),('68ee4ae9-cf25-5fe3-9749-e4720f2a135c'::uuid,'/art/ghosts36-047.webp','/thumbs/ghosts36-047.webp'),('e087040a-9cb9-5b9c-b95f-55d78799ab98'::uuid,'/art/ghosts36-048.webp','/thumbs/ghosts36-048.webp'),('1571c1c4-a9b2-5848-bef9-9879f8af1247'::uuid,'/art/ghosts36-049.webp','/thumbs/ghosts36-049.webp'),('b27fddd2-6b7f-549f-9dbc-36c795ac62f2'::uuid,'/art/ghosts36-050.webp','/thumbs/ghosts36-050.webp'),('a3e3a922-8e54-5524-a856-3c3e90a29da0'::uuid,'/art/ghosts36-051.webp','/thumbs/ghosts36-051.webp'),('c7a491b2-dd49-5fe4-90e3-2a8e84ba274a'::uuid,'/art/ghosts36-052.webp','/thumbs/ghosts36-052.webp'),('e32dc1ae-a9dd-512f-8c57-0658e0feb91f'::uuid,'/art/ghosts36-053.webp','/thumbs/ghosts36-053.webp'),('0b21e52c-d41c-5812-9967-e49e63b2aaea'::uuid,'/art/ghosts36-054.webp','/thumbs/ghosts36-054.webp'),('91b586f8-509d-53f2-b3b7-227c8f367f58'::uuid,'/art/ghosts36-055.webp','/thumbs/ghosts36-055.webp'),('17521e0e-331e-595a-8394-a28ddadadb60'::uuid,'/art/ghosts36-056.webp','/thumbs/ghosts36-056.webp'),('5a36b58c-c407-5429-a151-36e82969296e'::uuid,'/art/ghosts36-057.webp','/thumbs/ghosts36-057.webp'),('eebe1692-55fb-5601-89f3-6ba49c3ca29f'::uuid,'/art/ghosts36-058.webp','/thumbs/ghosts36-058.webp'),('9c747640-d907-51eb-b2c5-734f2d0f181c'::uuid,'/art/ghosts36-059.webp','/thumbs/ghosts36-059.webp'),('a2092423-6f69-5043-958c-092b3bd7d661'::uuid,'/art/ghosts36-060.webp','/thumbs/ghosts36-060.webp'),('7bfe30a3-8779-522c-9370-5558ac8f5d18'::uuid,'/art/ghosts36-061.webp','/thumbs/ghosts36-061.webp'),('36a44ff2-b3af-50e8-afd8-48bfd3ce4278'::uuid,'/art/ghosts36-062.webp','/thumbs/ghosts36-062.webp'),('827dd11e-2bec-5477-9f38-505b67e77bf7'::uuid,'/art/ghosts36-063.webp','/thumbs/ghosts36-063.webp'),('0c2276d8-c125-5919-9a41-4c9a79a47796'::uuid,'/art/ghosts36-064.webp','/thumbs/ghosts36-064.webp'),('33043a35-547c-504a-960e-e14484ba24aa'::uuid,'/art/ghosts36-065.webp','/thumbs/ghosts36-065.webp'),('cb138f72-4565-5f31-b3e1-14cd7caab1bf'::uuid,'/art/ghosts36-066.webp','/thumbs/ghosts36-066.webp'),('098d4511-f321-5159-bdae-4b870f1b21cf'::uuid,'/art/ghosts36-067.webp','/thumbs/ghosts36-067.webp'),('73fe02da-e82c-5532-9028-14f0d129ed61'::uuid,'/art/ghosts36-068.webp','/thumbs/ghosts36-068.webp'),('4194deb8-721e-5516-a308-d044814e2643'::uuid,'/art/ghosts36-069.webp','/thumbs/ghosts36-069.webp'),('124d823c-a3ed-5bc2-accf-fe6d3e14871a'::uuid,'/art/ghosts36-070.webp','/thumbs/ghosts36-070.webp'),('d282292a-2d1d-5ccf-9df0-e0c3ba49e913'::uuid,'/art/ghosts36-071.webp','/thumbs/ghosts36-071.webp'),('35100679-242f-5596-aa2c-473d3d08ce16'::uuid,'/art/ghosts36-072.webp','/thumbs/ghosts36-072.webp'),('427aec06-763c-5bd2-bc73-ac7340dc4dbf'::uuid,'/art/ghosts36-073.webp','/thumbs/ghosts36-073.webp'),('bad3460d-d36c-5a09-9543-799018d2707e'::uuid,'/art/ghosts36-074.webp','/thumbs/ghosts36-074.webp'),('c0c9c855-634d-5e80-8c84-510253527921'::uuid,'/art/ghosts36-075.webp','/thumbs/ghosts36-075.webp'),('e0ee3d73-ab44-5335-b86c-c1c51a49be34'::uuid,'/art/ghosts36-076.webp','/thumbs/ghosts36-076.webp'),('4eaf5dfd-4b66-5461-813f-bf6f44e38dda'::uuid,'/art/ghosts36-077.webp','/thumbs/ghosts36-077.webp'),('76384db3-266a-5b26-bb3a-9be68ab534c1'::uuid,'/art/ghosts36-078.webp','/thumbs/ghosts36-078.webp')) as expected(id,src,thumb_src) join public.artworks a on a.id=expected.id where a.src is distinct from expected.src or a.thumb_src is distinct from expected.thumb_src or a.media_type is distinct from 'image') then raise exception 'Artwork asset collision'; end if;
end $$;
set constraints all immediate;
commit;

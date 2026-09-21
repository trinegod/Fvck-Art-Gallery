-- ROLLBACK-ONLY behavior rehearsal after artwork_feedback.sql is activated.
-- Run the ENTIRE script on ONE privileged connection, stopping on any error.
-- Never remove ROLLBACK. Inspect installed comments/notifications triggers and
-- their callees first for nontransactional effects. Only new, collision-checked
-- comment/notification fixtures are written. Existing profiles/artwork are read.
-- No auth.users access, account changes, storage operations, or real demo posts.
-- SET LOCAL ROLE tests SQL authorization, NOT a real browser/JWT session.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create temporary table af_context on commit drop as
select sakura.id as actor_id, collection.owner_id, artwork.id as artwork_id, artwork.src,
  (select video.id from public.artworks video where video.media_type = 'video' order by video.id limit 1) as video_id,
  (select video.src from public.artworks video where video.media_type = 'video' order by video.id limit 1) as video_src
from public.profiles sakura
cross join public.artworks artwork
join public.collections collection on collection.id = artwork.collection_id
where sakura.username = 'princess-sakura-test'
  and collection.owner_id is not null and collection.owner_id <> sakura.id
  and coalesce(artwork.media_type, 'image') = 'image'
order by (collection.id = '8ef7fee8-f4a8-54c1-b91a-9be2d32184f5'::uuid) desc, artwork.id
limit 1;
create temporary table af_ids(name text primary key, id uuid not null unique) on commit drop;
insert into af_ids values
  ('pinned', 'e720feed-0000-4000-8000-000000000001'),
  ('ordinary', 'e720feed-0000-4000-8000-000000000002'),
  ('invalid', 'e720feed-0000-4000-8000-000000000003'),
  ('foreign', 'e720feed-0000-4000-8000-000000000004');
create temporary table af_assertions(label text primary key) on commit drop;

create function pg_temp.af_id(label text) returns uuid language sql stable as $$
  select id from pg_temp.af_ids where name = label;
$$;
create function pg_temp.af_assert(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Feedback rehearsal failed: %', label; end if;
  insert into pg_temp.af_assertions values (label);
end;
$$;
create function pg_temp.af_identity(actor uuid, role_name text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor::text, ''), true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', role_name)::text, true);
  perform set_config('request.jwt.claim.role', role_name, true);
end;
$$;
create function pg_temp.af_denied(label text, command text, expected_state text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
  begin
    execute command;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'Unexpected SQLSTATE % in % (expected %)', sqlstate, label, expected_state;
    end if;
    rejected := true;
  end;
  perform pg_temp.af_assert(rejected, label);
end;
$$;

select pg_temp.af_assert((select count(*) = 1 from af_context), 'public Sakura profile and separately owned image exist');
select pg_temp.af_assert((select video_id is not null and video_src is not null from af_context), 'a public video is available for the non-image rejection test');
select pg_temp.af_assert(not exists (select 1 from public.comments where id in (select id from af_ids))
  and not exists (select 1 from public.notifications where comment_id in (select id from af_ids)
    or source_key in (select 'comment:' || id::text from af_ids)),
  'fixture IDs and notification source keys are unused; never overwrite existing data');
select pg_temp.af_assert(exists (select 1 from pg_trigger where tgrelid = 'public.comments'::regclass
  and tgname = 'validate_comment_pin_source' and tgenabled = 'O'), 'source validation is active');
select pg_temp.af_assert(exists (select 1 from pg_trigger where tgrelid = 'public.comments'::regclass
  and tgname = 'create_comment_activity' and tgenabled = 'O'), 'existing owner notification trigger remains active');

do $$
begin
  execute format('grant usage on schema %I to authenticated, anon', pg_my_temp_schema()::regnamespace);
end;
$$;
grant select on af_context, af_ids to authenticated, anon;
grant select, insert on af_assertions to authenticated, anon;

select pg_temp.af_identity(actor_id) from af_context;
set local role authenticated;
select pg_temp.af_assert((select auth.uid() = actor_id from af_context), 'authenticated role sees the Sakura test subject');

insert into public.comments(id, artwork_id, user_id, body, pin_x, pin_y, pin_src)
select pg_temp.af_id('pinned'), artwork_id, actor_id, 'Rollback-only pinpoint fixture', 0.25, 0.75, src from af_context;
select pg_temp.af_assert((select count(*) = 1 from public.comments
  where id = pg_temp.af_id('pinned') and pin_x = 0.25 and pin_y = 0.75), 'author posts readable pinpoint feedback');

insert into public.comments(id, artwork_id, user_id, body)
select pg_temp.af_id('ordinary'), artwork_id, actor_id, 'Rollback-only ordinary fixture' from af_context;
select pg_temp.af_assert((select count(*) = 1 from public.comments where id = pg_temp.af_id('ordinary')
  and pin_x is null and pin_y is null and pin_src is null), 'ordinary discussion remains backward compatible');

select pg_temp.af_denied('duplicate attempt ID is rejected without duplicating feedback',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,0.25,0.75,%L)',
    pg_temp.af_id('pinned'), artwork_id, actor_id, 'Rollback-only pinpoint fixture', src), '23505') from af_context;
select pg_temp.af_denied('a user cannot forge another author',
  format('insert into public.comments(id,artwork_id,user_id,body) values(%L,%L,%L,%L)',
    pg_temp.af_id('invalid'), artwork_id, owner_id, 'Rollback-only forged author'), '42501') from af_context;
select pg_temp.af_denied('a user cannot update comment content or reassign authorship',
  format('update public.comments set body=%L where id=%L', 'Rollback-only spoof edit', pg_temp.af_id('pinned')), '42501');
select pg_temp.af_denied('a user cannot spoof the server creation timestamp',
  format('insert into public.comments(id,artwork_id,user_id,body,created_at) values(%L,%L,%L,%L,now())',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only timestamp spoof'), '42501') from af_context;

select pg_temp.af_denied('half-null y anchor is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,0.25,null,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only half anchor', src), '23514') from af_context;
select pg_temp.af_denied('half-null x anchor is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,null,0.75,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only half anchor', src), '23514') from af_context;
select pg_temp.af_denied('NaN coordinate is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,%L::double precision,0.75,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only NaN anchor', 'NaN', src), '23514') from af_context;
select pg_temp.af_denied('infinite coordinate is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,0.25,%L::double precision,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only infinite anchor', 'Infinity', src), '23514') from af_context;
select pg_temp.af_denied('out-of-image coordinate is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,-0.01,0.75,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only outside anchor', src), '23514') from af_context;
select pg_temp.af_denied('an unrelated image source is rejected',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,0.25,0.75,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only wrong source', src || '#rollback-wrong-source'), '22023') from af_context;
select pg_temp.af_denied('video cannot receive an image anchor',
  format('insert into public.comments(id,artwork_id,user_id,body,pin_x,pin_y,pin_src) values(%L,%L,%L,%L,0.25,0.75,%L)',
    pg_temp.af_id('invalid'), video_id, actor_id, 'Rollback-only video anchor', video_src), '22023') from af_context;
reset role;

select pg_temp.af_identity(owner_id) from af_context;
set local role authenticated;
select pg_temp.af_assert((select count(*) = 1 from public.notifications n cross join af_context c
  where n.comment_id = pg_temp.af_id('pinned') and n.source_key = 'comment:' || pg_temp.af_id('pinned')::text
    and n.actor_id = c.actor_id and n.recipient_id = c.owner_id and n.kind = 'artwork_comment'),
  'owner receives exactly one existing-kind notification after the duplicate retry');
insert into public.comments(id, artwork_id, user_id, body)
select pg_temp.af_id('foreign'), artwork_id, owner_id, 'Rollback-only owner fixture' from af_context;
reset role;

select pg_temp.af_identity(actor_id) from af_context;
set local role authenticated;
with removed as (delete from public.comments where id = pg_temp.af_id('foreign') returning id)
select pg_temp.af_assert((select count(*) = 0 from removed), 'deleting another author affects zero rows');
select pg_temp.af_assert((select count(*) = 1 from public.comments where id = pg_temp.af_id('foreign')),
  'foreign comment remains readable after denied deletion');
select pg_temp.af_assert((select count(*) = 0 from public.notifications where comment_id = pg_temp.af_id('pinned')),
  'comment author cannot read the owner private notification');
with removed as (delete from public.comments where id = pg_temp.af_id('ordinary') returning id)
select pg_temp.af_assert((select count(*) = 1 from removed), 'author can remove their own ordinary comment');
with removed as (delete from public.comments where id = pg_temp.af_id('pinned') returning id)
select pg_temp.af_assert((select count(*) = 1 from removed), 'author can remove their own pinpoint feedback');
reset role;

select pg_temp.af_assert(not exists (select 1 from public.notifications
  where comment_id in (pg_temp.af_id('ordinary'), pg_temp.af_id('pinned'))), 'comment deletion cleans only its related notification fixtures');

select pg_temp.af_identity(null, 'anon');
set local role anon;
select pg_temp.af_assert((select count(*) = 1 from public.comments where id = pg_temp.af_id('foreign')),
  'signed-out visitor can read the public discussion');
select pg_temp.af_denied('signed-out visitor cannot post',
  format('insert into public.comments(id,artwork_id,user_id,body) values(%L,%L,%L,%L)',
    pg_temp.af_id('invalid'), artwork_id, actor_id, 'Rollback-only anon post'), '42501') from af_context;
select pg_temp.af_denied('signed-out visitor cannot delete',
  format('delete from public.comments where id=%L', pg_temp.af_id('foreign')), '42501');
reset role;

select label as passed_check from af_assertions order by label;
select count(*) as passed_checks, 'All fixture changes roll back below. Browser/JWT tests are separate.' as scope from af_assertions;
rollback;

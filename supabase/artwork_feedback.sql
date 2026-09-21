-- Pinpoint feedback is an ordinary public discussion comment with an optional
-- immutable image anchor. Run after comments.sql; apply before the feedback UI.
-- Existing comments and notification IDs remain intact. No new storage bucket.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.comments
  add column if not exists pin_x double precision,
  add column if not exists pin_y double precision,
  add column if not exists pin_src text;

alter table public.comments drop constraint if exists comments_pinpoint_anchor_valid;
alter table public.comments add constraint comments_pinpoint_anchor_valid check (
  (pin_x is null and pin_y is null and pin_src is null)
  or (
    pin_x is not null and pin_y is not null and pin_src is not null
    and pin_x between 0 and 1 and pin_y between 0 and 1
    and pin_x <> 'NaN'::double precision and pin_y <> 'NaN'::double precision
    and char_length(btrim(pin_src)) between 1 and 2048
    and char_length(pin_src) <= 2048
  )
);

create index if not exists comments_artwork_created_id_idx
  on public.comments (artwork_id, created_at, id);

create or replace function public.validate_comment_pin_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.pin_x is not null and not exists (
    select 1 from public.artworks artwork
    where artwork.id = new.artwork_id
      and artwork.src = new.pin_src
      and coalesce(artwork.media_type, 'image') = 'image'
  ) then
    raise exception using errcode = '22023',
      message = 'Select a point on the current image before posting feedback.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_comment_pin_source() from public, anon, authenticated;
drop trigger if exists validate_comment_pin_source on public.comments;
create trigger validate_comment_pin_source
  before insert or update of artwork_id, pin_x, pin_y, pin_src on public.comments
  for each row execute function public.validate_comment_pin_source();

alter table public.comments enable row level security;

-- Some legacy installations grant ALL to API roles. Limit direct operations,
-- including any pre-existing column grants; server-owned created_at cannot be
-- supplied by an API client. No UPDATE/UPSERT/TRUNCATE or author reassignment.
revoke all on table public.comments from public, anon, authenticated;
do $$
declare
  column_names text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into column_names
  from pg_attribute
  where attrelid = 'public.comments'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke all (%s) on table public.comments from public, anon, authenticated', column_names);
end;
$$;
grant select on table public.comments to anon, authenticated;
grant insert (id, artwork_id, user_id, body, pin_x, pin_y, pin_src) on public.comments to authenticated;
grant delete on table public.comments to authenticated;

-- Named permissive policies preserve the original application contract.
drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable" on public.comments for select using (true);
drop policy if exists "Signed in users can comment" on public.comments;
create policy "Signed in users can comment" on public.comments
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments" on public.comments
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Restrictive guards prevent another permissive legacy policy from broadening
-- authorship. They neither remove existing data nor affect the service role.
drop policy if exists "Comment insert author guard" on public.comments;
create policy "Comment insert author guard" on public.comments as restrictive
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Comment delete author guard" on public.comments;
create policy "Comment delete author guard" on public.comments as restrictive
  for delete to authenticated using ((select auth.uid()) = user_id);

comment on column public.comments.pin_x is 'Optional normalized image x, 0–1; only visible in feedback mode.';
comment on column public.comments.pin_y is 'Optional normalized image y, 0–1; paired with x and source.';
comment on column public.comments.pin_src is 'Image source at comment creation; hide the marker if the source changes.';

notify pgrst, 'reload schema';
commit;

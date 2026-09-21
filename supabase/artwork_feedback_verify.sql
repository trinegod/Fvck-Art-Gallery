-- Read-only activation checks. This does not impersonate a user or post a demo.
-- Browser/JWT tests are still required for actual post/delete/notification flows.
begin read only;
set local statement_timeout = '15s';

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.comments'::regclass) then
    raise exception 'Feedback audit: comments RLS is disabled';
  end if;
  if not has_table_privilege('anon', 'public.comments', 'SELECT')
    or not has_table_privilege('authenticated', 'public.comments', 'SELECT')
    or not has_table_privilege('authenticated', 'public.comments', 'DELETE') then
    raise exception 'Feedback audit: expected read/delete privileges are missing';
  end if;
  if has_any_column_privilege('anon', 'public.comments', 'INSERT')
    or has_any_column_privilege('anon', 'public.comments', 'UPDATE')
    or has_table_privilege('anon', 'public.comments', 'DELETE')
    or has_any_column_privilege('authenticated', 'public.comments', 'UPDATE')
    or has_table_privilege('authenticated', 'public.comments', 'TRUNCATE')
    or has_column_privilege('authenticated', 'public.comments', 'created_at', 'INSERT') then
    raise exception 'Feedback audit: broad mutation privileges remain';
  end if;
  if exists (
    select 1 from unnest(array['id','artwork_id','user_id','body','pin_x','pin_y','pin_src']) column_name
    where not has_column_privilege('authenticated', 'public.comments', column_name, 'INSERT')
  ) then
    raise exception 'Feedback audit: required insert column privileges are missing';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass and conname = 'comments_pinpoint_anchor_valid' and convalidated) then
    raise exception 'Feedback audit: anchor validation is missing or unvalidated';
  end if;
  if not exists (select 1 from pg_trigger
    where tgrelid = 'public.comments'::regclass and tgname = 'validate_comment_pin_source' and tgenabled = 'O') then
    raise exception 'Feedback audit: image source trigger is not enabled';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass
    and polname = 'Comment insert author guard' and not polpermissive and polcmd = 'a')
    or not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass
    and polname = 'Comment delete author guard' and not polpermissive and polcmd = 'd') then
    raise exception 'Feedback audit: restrictive author protections are missing';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.validate_comment_pin_source()'::regprocedure) then
    raise exception 'Feedback audit: source validator must not be security definer';
  end if;
end;
$$;

select 'Feedback database activation checks passed; JWT/browser behavior still requires testing.' as result;
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'comments' order by policyname;
select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger where tgrelid = 'public.comments'::regclass and not tgisinternal order by tgname;
commit;

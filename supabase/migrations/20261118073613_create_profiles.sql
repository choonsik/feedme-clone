-- Profiles: one row per auth user, editable display name, owner-only access.

create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  primary key (id)
);

alter table public.profiles enable row level security;

-- Only signed-in users can touch the table; the trigger below creates rows.
revoke all on public.profiles from anon, authenticated;
grant select, update (display_name) on public.profiles to authenticated;

create policy "Profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Profiles are updatable by their owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- The trigger function lives in a schema that the Data API does not expose.
create schema if not exists private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

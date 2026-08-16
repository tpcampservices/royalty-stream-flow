begin;

-- Application roles are organization-scoped. A user can hold a different role in
-- each organization they belong to.
do $$
begin
  create type public.app_role as enum ('admin', 'finance', 'reviewer');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);

-- Backfill public profiles for existing Auth users, then keep them in sync for
-- newly-created accounts.
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users u
on conflict (id) do update set email = excluded.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at_column();
create trigger organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.update_updated_at_column();

-- SECURITY DEFINER helpers avoid recursive RLS lookups. Every relation is schema
-- qualified and the search path is empty to prevent object-shadowing attacks.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.shares_organization(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user_id
  );
$$;

create or replace function public.create_organization(organization_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_organization_id uuid := gen_random_uuid();
  base_slug text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  organization_name := trim(organization_name);
  if char_length(organization_name) < 2 or char_length(organization_name) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(organization_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then
    base_slug := 'organization';
  end if;

  insert into public.organizations (id, name, slug, created_by)
  values (
    new_organization_id,
    organization_name,
    left(base_slug, 48) || '-' || left(replace(new_organization_id::text, '-', ''), 8),
    caller_id
  );

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, caller_id, 'admin');

  return new_organization_id;
end;
$$;

create or replace function public.add_organization_member_by_email(
  target_organization_id uuid,
  member_email text,
  member_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if not public.has_organization_role(target_organization_id, array['admin']::public.app_role[]) then
    raise exception 'Only organization admins can add team members' using errcode = '42501';
  end if;

  -- Serialize team changes per organization so last-admin checks cannot race.
  perform 1 from public.organizations organization
  where organization.id = target_organization_id
  for update;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(member_email))
  order by u.created_at
  limit 1;

  if target_user_id is null then
    raise exception 'No account exists for that email. Ask the user to sign up first.';
  end if;

  if exists (
    select 1 from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_user_id
  ) then
    raise exception 'That user already belongs to this organization';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (target_organization_id, target_user_id, member_role);
end;
$$;

create or replace function public.set_organization_member_role(
  target_organization_id uuid,
  target_user_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role public.app_role;
  admin_count integer;
begin
  if not public.has_organization_role(target_organization_id, array['admin']::public.app_role[]) then
    raise exception 'Only organization admins can change roles' using errcode = '42501';
  end if;

  perform 1 from public.organizations organization
  where organization.id = target_organization_id
  for update;

  select membership.role into previous_role
  from public.organization_members membership
  where membership.organization_id = target_organization_id
    and membership.user_id = target_user_id
  for update;

  if previous_role is null then
    raise exception 'Team member not found';
  end if;

  if previous_role = 'admin' and new_role <> 'admin' then
    select count(*) into admin_count
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.role = 'admin';
    if admin_count <= 1 then
      raise exception 'An organization must retain at least one admin';
    end if;
  end if;

  update public.organization_members
  set role = new_role
  where organization_id = target_organization_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.remove_organization_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  admin_count integer;
begin
  if not public.has_organization_role(target_organization_id, array['admin']::public.app_role[]) then
    raise exception 'Only organization admins can remove team members' using errcode = '42501';
  end if;

  perform 1 from public.organizations organization
  where organization.id = target_organization_id
  for update;

  if target_user_id = auth.uid() then
    raise exception 'You cannot remove yourself from an organization';
  end if;

  select membership.role into target_role
  from public.organization_members membership
  where membership.organization_id = target_organization_id
    and membership.user_id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Team member not found';
  end if;

  if target_role = 'admin' then
    select count(*) into admin_count
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.role = 'admin';
    if admin_count <= 1 then
      raise exception 'An organization must retain at least one admin';
    end if;
  end if;

  delete from public.organization_members
  where organization_id = target_organization_id
    and user_id = target_user_id;
end;
$$;

-- Add tenant ownership to every business table. Existing rows intentionally keep
-- NULL ownership and become inaccessible until an administrator performs the
-- documented, explicit backfill.
alter table public.members add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.sound_recordings add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.recording_shares add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.licensees add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.weighting_rules add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.pools add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.usage_logs add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.payments add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

create index if not exists members_organization_id_idx on public.members(organization_id);
create index if not exists sound_recordings_organization_id_idx on public.sound_recordings(organization_id);
create index if not exists recording_shares_organization_id_idx on public.recording_shares(organization_id);
create index if not exists licensees_organization_id_idx on public.licensees(organization_id);
create index if not exists weighting_rules_organization_id_idx on public.weighting_rules(organization_id);
create index if not exists pools_organization_id_idx on public.pools(organization_id);
create index if not exists usage_logs_organization_id_idx on public.usage_logs(organization_id);
create index if not exists payments_organization_id_idx on public.payments(organization_id);

-- Bank details are isolated so reviewers can read member metadata without seeing
-- payment credentials. Legacy values are preserved even before tenant backfill.
create table if not exists public.member_payment_details (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  member_id uuid not null unique references public.members(id) on delete restrict,
  bank_name text,
  bank_account text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.member_payment_details (organization_id, member_id, bank_name, bank_account)
select m.organization_id, m.id, m.bank_name, m.bank_account
from public.members m
where m.bank_name is not null or m.bank_account is not null
on conflict (member_id) do update
  set bank_name = excluded.bank_name,
      bank_account = excluded.bank_account,
      organization_id = coalesce(excluded.organization_id, public.member_payment_details.organization_id),
      updated_at = now();

alter table public.members drop column if exists bank_name;
alter table public.members drop column if exists bank_account;

create index if not exists member_payment_details_organization_id_idx
  on public.member_payment_details(organization_id);
create trigger member_payment_details_updated_at
  before update on public.member_payment_details
  for each row execute function public.update_updated_at_column();

-- Keep tenant ownership immutable after assignment and reject cross-tenant
-- references, including requests sent directly to the Data API.
create or replace function public.enforce_tenant_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  tenant_id uuid := nullif(row_data ->> 'organization_id', '')::uuid;
  old_tenant_id uuid;
  reference_id uuid;
begin
  if tg_op = 'UPDATE' then
    old_tenant_id := nullif(to_jsonb(old) ->> 'organization_id', '')::uuid;
    if old_tenant_id is not null and tenant_id is distinct from old_tenant_id then
      raise exception 'organization_id cannot be changed after assignment' using errcode = '23514';
    end if;
  end if;

  if tenant_id is null then
    return new;
  end if;

  if tg_table_name = 'recording_shares' then
    reference_id := nullif(row_data ->> 'recording_id', '')::uuid;
    if not exists (select 1 from public.sound_recordings r where r.id = reference_id and r.organization_id = tenant_id) then
      raise exception 'Recording must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Member must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'usage_logs' then
    reference_id := nullif(row_data ->> 'pool_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.pools p where p.id = reference_id and p.organization_id = tenant_id) then
      raise exception 'Pool must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'licensee_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.licensees l where l.id = reference_id and l.organization_id = tenant_id) then
      raise exception 'Licensee must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'recording_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.sound_recordings r where r.id = reference_id and r.organization_id = tenant_id) then
      raise exception 'Recording must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'payments' then
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Member must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'pool_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.pools p where p.id = reference_id and p.organization_id = tenant_id) then
      raise exception 'Pool must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'member_payment_details' then
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Member must belong to the same organization' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'members', 'sound_recordings', 'recording_shares', 'licensees',
    'weighting_rules', 'pools', 'usage_logs', 'payments', 'member_payment_details'
  ]
  loop
    execute format('drop trigger if exists enforce_tenant_integrity on public.%I', table_name);
    execute format(
      'create trigger enforce_tenant_integrity before insert or update on public.%I for each row execute function public.enforce_tenant_integrity()',
      table_name
    );
  end loop;
end
$$;

-- Remove the original public policies and anonymous Data API access.
drop policy if exists "Open access to members" on public.members;
drop policy if exists "Open access to sound_recordings" on public.sound_recordings;
drop policy if exists "Open access to recording_shares" on public.recording_shares;
drop policy if exists "Open access to licensees" on public.licensees;
drop policy if exists "Open access to weighting_rules" on public.weighting_rules;
drop policy if exists "Open access to pools" on public.pools;
drop policy if exists "Open access to usage_logs" on public.usage_logs;
drop policy if exists "Open access to payments" on public.payments;

revoke all on table public.profiles, public.organizations, public.organization_members,
  public.members, public.sound_recordings, public.recording_shares, public.licensees,
  public.weighting_rules, public.pools, public.usage_logs, public.payments,
  public.member_payment_details from anon;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.organizations to authenticated;
grant update (name) on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.members, public.sound_recordings,
  public.recording_shares, public.licensees, public.weighting_rules, public.pools,
  public.usage_logs, public.payments, public.member_payment_details to authenticated;
revoke usage on type public.app_role from anon;
grant usage on type public.app_role to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.member_payment_details enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.shares_organization(id)));
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "organizations_select" on public.organizations;
create policy "organizations_select" on public.organizations for select to authenticated
using ((select public.is_organization_member(id)));
drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations for update to authenticated
using ((select public.has_organization_role(id, array['admin']::public.app_role[])))
with check ((select public.has_organization_role(id, array['admin']::public.app_role[])));

drop policy if exists "organization_members_select" on public.organization_members;
create policy "organization_members_select" on public.organization_members for select to authenticated
using ((select public.is_organization_member(organization_id)));

-- Tenant members can read ordinary business records. Write permissions are split
-- by responsibility, while destructive deletes remain admin-only.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'members', 'sound_recordings', 'recording_shares', 'licensees',
    'weighting_rules', 'pools', 'usage_logs', 'payments'
  ]
  loop
    execute format('drop policy if exists "tenant_select" on public.%I', table_name);
    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated using ((select public.is_organization_member(organization_id)))',
      table_name
    );
    execute format('drop policy if exists "tenant_delete_admin" on public.%I', table_name);
    execute format(
      'create policy "tenant_delete_admin" on public.%I for delete to authenticated using ((select public.has_organization_role(organization_id, array[''admin'']::public.app_role[])))',
      table_name
    );
  end loop;

  foreach table_name in array array['members', 'licensees', 'pools', 'payments']
  loop
    execute format('drop policy if exists "tenant_insert_finance" on public.%I', table_name);
    execute format(
      'create policy "tenant_insert_finance" on public.%I for insert to authenticated with check ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[])))',
      table_name
    );
    execute format('drop policy if exists "tenant_update_finance" on public.%I', table_name);
    execute format(
      'create policy "tenant_update_finance" on public.%I for update to authenticated using ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[]))) with check ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[])))',
      table_name
    );
  end loop;

  foreach table_name in array array['sound_recordings', 'recording_shares', 'weighting_rules', 'usage_logs']
  loop
    execute format('drop policy if exists "tenant_insert_reviewer" on public.%I', table_name);
    execute format(
      'create policy "tenant_insert_reviewer" on public.%I for insert to authenticated with check ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[])))',
      table_name
    );
    execute format('drop policy if exists "tenant_update_reviewer" on public.%I', table_name);
    execute format(
      'create policy "tenant_update_reviewer" on public.%I for update to authenticated using ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[]))) with check ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[])))',
      table_name
    );
  end loop;
end
$$;

drop policy if exists "payment_details_select" on public.member_payment_details;
create policy "payment_details_select" on public.member_payment_details for select to authenticated
using ((select public.has_organization_role(organization_id, array['admin', 'finance']::public.app_role[])));
drop policy if exists "payment_details_insert" on public.member_payment_details;
create policy "payment_details_insert" on public.member_payment_details for insert to authenticated
with check ((select public.has_organization_role(organization_id, array['admin', 'finance']::public.app_role[])));
drop policy if exists "payment_details_update" on public.member_payment_details;
create policy "payment_details_update" on public.member_payment_details for update to authenticated
using ((select public.has_organization_role(organization_id, array['admin', 'finance']::public.app_role[])))
with check ((select public.has_organization_role(organization_id, array['admin', 'finance']::public.app_role[])));
drop policy if exists "payment_details_delete_admin" on public.member_payment_details;
create policy "payment_details_delete_admin" on public.member_payment_details for delete to authenticated
using ((select public.has_organization_role(organization_id, array['admin']::public.app_role[])));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_tenant_integrity() from public, anon, authenticated;
revoke execute on function public.is_organization_member(uuid) from public, anon;
revoke execute on function public.has_organization_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.shares_organization(uuid) from public, anon;
revoke execute on function public.create_organization(text) from public, anon;
revoke execute on function public.add_organization_member_by_email(uuid, text, public.app_role) from public, anon;
revoke execute on function public.set_organization_member_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.remove_organization_member(uuid, uuid) from public, anon;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.shares_organization(uuid) to authenticated;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.add_organization_member_by_email(uuid, text, public.app_role) to authenticated;
grant execute on function public.set_organization_member_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;

commit;

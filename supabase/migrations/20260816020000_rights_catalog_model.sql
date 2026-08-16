begin;

-- A rights party may act in more than one capacity. The legacy members.role
-- column is retained for compatibility, but member_roles is authoritative for
-- catalog relationships.
alter table public.members add column if not exists entity_type text not null default 'person';
alter table public.members add column if not exists legal_name text;
alter table public.members add column if not exists isni text;
alter table public.members add column if not exists ipn_number text;
alter table public.members add column if not exists society_code text;
alter table public.members add column if not exists country_code text;

alter table public.members drop constraint if exists members_entity_type_check;
alter table public.members add constraint members_entity_type_check
  check (entity_type in ('person', 'organization'));

alter table public.pools add column if not exists rights_domain text not null default 'composition';
alter table public.pools drop constraint if exists pools_rights_domain_check;
alter table public.pools add constraint pools_rights_domain_check
  check (rights_domain in ('composition', 'master'));

create table public.member_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  role text not null check (role in ('writer', 'publisher', 'administrator', 'performer', 'producer', 'label')),
  created_at timestamptz not null default now(),
  unique (member_id, role)
);

create table public.compositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  work_code text,
  iswc text,
  title text not null check (char_length(trim(title)) between 1 and 500),
  alternate_title text,
  work_type text not null default 'original'
    check (work_type in ('original', 'arrangement', 'adaptation', 'translation', 'medley')),
  language_code text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'registered'
    check (status in ('registered', 'pending', 'disputed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.composition_writers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  composition_id uuid not null references public.compositions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  writer_role text not null default 'composer'
    check (writer_role in ('composer', 'lyricist', 'author', 'composer_lyricist', 'arranger', 'adapter', 'translator')),
  ownership_percentage numeric(7,4) not null default 0
    check (ownership_percentage >= 0 and ownership_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (composition_id, member_id, writer_role)
);

create table public.composition_publishers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  composition_id uuid not null references public.compositions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  publisher_role text not null default 'original_publisher'
    check (publisher_role in ('original_publisher', 'administrator', 'sub_publisher')),
  ownership_percentage numeric(7,4) not null default 0
    check (ownership_percentage >= 0 and ownership_percentage <= 100),
  collection_percentage numeric(7,4) not null default 0
    check (collection_percentage >= 0 and collection_percentage <= 100),
  territory text not null default 'WORLD',
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique (composition_id, member_id, publisher_role, territory)
);

-- A sound recording embodies one or more compositions. share_percentage is the
-- portion of the recording attributable to each composition (for example a
-- medley); it is not a writer or master ownership share.
create table public.recording_compositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  recording_id uuid not null references public.sound_recordings(id) on delete cascade,
  composition_id uuid not null references public.compositions(id) on delete restrict,
  sequence_number integer not null default 1 check (sequence_number > 0),
  share_percentage numeric(7,4) not null default 100
    check (share_percentage > 0 and share_percentage <= 100),
  created_at timestamptz not null default now(),
  unique (recording_id, composition_id)
);

-- Performer and producer tables are credits, not ownership tables. A producer's
-- contractual royalty points are stored separately from master ownership.
create table public.recording_performers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  recording_id uuid not null references public.sound_recordings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  performer_role text not null default 'main_artist'
    check (performer_role in ('main_artist', 'featured_artist', 'session_musician', 'background_vocalist', 'conductor', 'ensemble')),
  instrument text,
  legacy_share_percentage numeric(7,4)
    check (legacy_share_percentage is null or (legacy_share_percentage >= 0 and legacy_share_percentage <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recording_id, member_id, performer_role, instrument)
);

create table public.recording_producers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  recording_id uuid not null references public.sound_recordings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  producer_role text not null default 'producer'
    check (producer_role in ('producer', 'co_producer', 'executive_producer', 'remixer', 'recording_engineer', 'mixing_engineer', 'mastering_engineer')),
  royalty_points numeric(7,4) check (royalty_points is null or (royalty_points >= 0 and royalty_points <= 100)),
  legacy_share_percentage numeric(7,4)
    check (legacy_share_percentage is null or (legacy_share_percentage >= 0 and legacy_share_percentage <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recording_id, member_id, producer_role)
);

-- Only this table represents ownership or exclusive control of the master.
-- Labels, artists, producers, or other parties may be entered as rights holders;
-- their catalog capacity never implies ownership by itself.
create table public.recording_rights_holders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  recording_id uuid not null references public.sound_recordings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  rights_type text not null default 'master_owner'
    check (rights_type in ('master_owner', 'exclusive_licensee')),
  ownership_percentage numeric(7,4) not null default 0
    check (ownership_percentage >= 0 and ownership_percentage <= 100),
  territory text not null default 'WORLD',
  effective_from date,
  effective_to date,
  review_status text not null default 'confirmed'
    check (review_status in ('confirmed', 'needs_review', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique (recording_id, member_id, rights_type, territory)
);

create index compositions_organization_id_idx on public.compositions(organization_id);
create index compositions_title_idx on public.compositions(organization_id, lower(title));
create unique index compositions_iswc_unique_idx
  on public.compositions(organization_id, upper(regexp_replace(iswc, '[^A-Za-z0-9]', '', 'g')))
  where iswc is not null and trim(iswc) <> '';
create index member_roles_organization_id_idx on public.member_roles(organization_id);
create index member_roles_member_id_idx on public.member_roles(member_id);
create index composition_writers_organization_id_idx on public.composition_writers(organization_id);
create index composition_writers_composition_id_idx on public.composition_writers(composition_id);
create index composition_publishers_organization_id_idx on public.composition_publishers(organization_id);
create index composition_publishers_composition_id_idx on public.composition_publishers(composition_id);
create index recording_compositions_organization_id_idx on public.recording_compositions(organization_id);
create index recording_compositions_recording_id_idx on public.recording_compositions(recording_id);
create index recording_compositions_composition_id_idx on public.recording_compositions(composition_id);
create index recording_performers_organization_id_idx on public.recording_performers(organization_id);
create index recording_performers_recording_id_idx on public.recording_performers(recording_id);
create index recording_producers_organization_id_idx on public.recording_producers(organization_id);
create index recording_producers_recording_id_idx on public.recording_producers(recording_id);
create index recording_rights_holders_organization_id_idx on public.recording_rights_holders(organization_id);
create index recording_rights_holders_recording_id_idx on public.recording_rights_holders(recording_id);

create trigger compositions_updated_at before update on public.compositions
  for each row execute function public.update_updated_at_column();
create trigger composition_writers_updated_at before update on public.composition_writers
  for each row execute function public.update_updated_at_column();
create trigger composition_publishers_updated_at before update on public.composition_publishers
  for each row execute function public.update_updated_at_column();
create trigger recording_performers_updated_at before update on public.recording_performers
  for each row execute function public.update_updated_at_column();
create trigger recording_producers_updated_at before update on public.recording_producers
  for each row execute function public.update_updated_at_column();
create trigger recording_rights_holders_updated_at before update on public.recording_rights_holders
  for each row execute function public.update_updated_at_column();

-- Backfill member capacities from the former single role.
insert into public.member_roles (organization_id, member_id, role)
select
  member.organization_id,
  member.id,
  case lower(member.role)
    when 'composer' then 'writer'
    when 'author' then 'writer'
    when 'arranger' then 'writer'
    when 'writer' then 'writer'
    when 'publisher' then 'publisher'
    when 'administrator' then 'administrator'
    when 'performer' then 'performer'
    when 'producer' then 'producer'
    when 'label' then 'label'
    else 'writer'
  end
from public.members member
on conflict (member_id, role) do nothing;

insert into public.member_roles (organization_id, member_id, role)
select distinct
  share.organization_id,
  share.member_id,
  case lower(share.role)
    when 'composer' then 'writer'
    when 'author' then 'writer'
    when 'arranger' then 'writer'
    when 'publisher' then 'publisher'
    when 'performer' then 'performer'
    when 'producer' then 'producer'
    when 'label' then 'label'
    else 'writer'
  end
from public.recording_shares share
on conflict (member_id, role) do nothing;

create or replace function public.sync_primary_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog_role text;
begin
  catalog_role := case lower(new.role)
    when 'composer' then 'writer'
    when 'author' then 'writer'
    when 'arranger' then 'writer'
    when 'writer' then 'writer'
    when 'publisher' then 'publisher'
    when 'administrator' then 'administrator'
    when 'performer' then 'performer'
    when 'producer' then 'producer'
    when 'label' then 'label'
    else 'writer'
  end;
  insert into public.member_roles (organization_id, member_id, role)
  values (new.organization_id, new.id, catalog_role)
  on conflict (member_id, role) do nothing;
  return new;
end;
$$;

create trigger sync_primary_member_role
  after insert or update of role on public.members
  for each row execute function public.sync_primary_member_role();

create or replace function public.sync_catalog_relationship_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog_role text;
begin
  catalog_role := case tg_table_name
    when 'composition_writers' then 'writer'
    when 'composition_publishers' then
      case when new.publisher_role = 'administrator' then 'administrator' else 'publisher' end
    when 'recording_performers' then 'performer'
    when 'recording_producers' then 'producer'
    else null
  end;
  if catalog_role is not null then
    insert into public.member_roles (organization_id, member_id, role)
    values (new.organization_id, new.member_id, catalog_role)
    on conflict (member_id, role) do nothing;
  end if;
  return new;
end;
$$;

create trigger sync_composition_writer_capacity
  after insert or update of member_id, writer_role on public.composition_writers
  for each row execute function public.sync_catalog_relationship_capacity();
create trigger sync_composition_publisher_capacity
  after insert or update of member_id, publisher_role on public.composition_publishers
  for each row execute function public.sync_catalog_relationship_capacity();
create trigger sync_recording_performer_capacity
  after insert or update of member_id, performer_role on public.recording_performers
  for each row execute function public.sync_catalog_relationship_capacity();
create trigger sync_recording_producer_capacity
  after insert or update of member_id, producer_role on public.recording_producers
  for each row execute function public.sync_catalog_relationship_capacity();

-- Preserve existing catalog entries by creating one composition per legacy
-- recording. These generated links can later be merged when multiple recordings
-- are versions of the same composition.
create temporary table legacy_composition_map (
  recording_id uuid primary key,
  composition_id uuid not null
) on commit drop;

insert into legacy_composition_map (recording_id, composition_id)
select recording.id, gen_random_uuid()
from public.sound_recordings recording;

insert into public.compositions (
  id, organization_id, title, alternate_title, duration_seconds, status, notes
)
select
  map.composition_id,
  recording.organization_id,
  recording.title,
  recording.alternate_title,
  recording.duration_seconds,
  recording.status,
  'Created from the legacy recording catalog. Review and merge duplicate compositions where necessary.'
from legacy_composition_map map
join public.sound_recordings recording on recording.id = map.recording_id;

insert into public.recording_compositions (
  organization_id, recording_id, composition_id, sequence_number, share_percentage
)
select recording.organization_id, recording.id, map.composition_id, 1, 100
from legacy_composition_map map
join public.sound_recordings recording on recording.id = map.recording_id;

insert into public.composition_writers (
  organization_id, composition_id, member_id, writer_role, ownership_percentage
)
select
  share.organization_id,
  map.composition_id,
  share.member_id,
  case lower(share.role)
    when 'composer' then 'composer'
    when 'author' then 'lyricist'
    when 'arranger' then 'arranger'
    else 'composer'
  end,
  share.percentage
from public.recording_shares share
join legacy_composition_map map on map.recording_id = share.recording_id
where lower(share.role) in ('composer', 'author', 'arranger')
on conflict (composition_id, member_id, writer_role) do nothing;

insert into public.composition_publishers (
  organization_id, composition_id, member_id, publisher_role,
  ownership_percentage, collection_percentage, territory
)
select
  share.organization_id,
  map.composition_id,
  share.member_id,
  'original_publisher',
  share.percentage,
  share.percentage,
  'WORLD'
from public.recording_shares share
join legacy_composition_map map on map.recording_id = share.recording_id
where lower(share.role) = 'publisher'
on conflict (composition_id, member_id, publisher_role, territory) do nothing;

insert into public.recording_performers (
  organization_id, recording_id, member_id, performer_role, legacy_share_percentage
)
select share.organization_id, share.recording_id, share.member_id, 'main_artist', share.percentage
from public.recording_shares share
where lower(share.role) = 'performer'
on conflict do nothing;

insert into public.recording_producers (
  organization_id, recording_id, member_id, producer_role, legacy_share_percentage
)
select share.organization_id, share.recording_id, share.member_id, 'producer', share.percentage
from public.recording_shares share
where lower(share.role) = 'producer'
on conflict do nothing;

insert into public.recording_rights_holders (
  organization_id, recording_id, member_id, rights_type,
  ownership_percentage, territory, review_status
)
select
  share.organization_id,
  share.recording_id,
  share.member_id,
  'master_owner',
  share.percentage,
  'WORLD',
  'needs_review'
from public.recording_shares share
where lower(share.role) = 'label'
on conflict (recording_id, member_id, rights_type, territory) do nothing;

comment on table public.recording_shares is
  'Deprecated legacy mixed-share table. Read-only after the rights/catalog migration; use composition_writers, composition_publishers, recording_performers, recording_producers, and recording_rights_holders.';

-- Reject cross-organization relationships even when a caller bypasses the UI.
create or replace function public.enforce_catalog_tenant_integrity()
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

  if tg_table_name in ('member_roles') then
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Rights party must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name in ('composition_writers', 'composition_publishers') then
    reference_id := nullif(row_data ->> 'composition_id', '')::uuid;
    if not exists (select 1 from public.compositions c where c.id = reference_id and c.organization_id = tenant_id) then
      raise exception 'Composition must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Rights party must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'recording_compositions' then
    reference_id := nullif(row_data ->> 'recording_id', '')::uuid;
    if not exists (select 1 from public.sound_recordings r where r.id = reference_id and r.organization_id = tenant_id) then
      raise exception 'Recording must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'composition_id', '')::uuid;
    if not exists (select 1 from public.compositions c where c.id = reference_id and c.organization_id = tenant_id) then
      raise exception 'Composition must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name in ('recording_performers', 'recording_producers', 'recording_rights_holders') then
    reference_id := nullif(row_data ->> 'recording_id', '')::uuid;
    if not exists (select 1 from public.sound_recordings r where r.id = reference_id and r.organization_id = tenant_id) then
      raise exception 'Recording must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'member_id', '')::uuid;
    if not exists (select 1 from public.members m where m.id = reference_id and m.organization_id = tenant_id) then
      raise exception 'Rights party must belong to the same organization' using errcode = '23514';
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
    'member_roles', 'compositions', 'composition_writers', 'composition_publishers',
    'recording_compositions', 'recording_performers', 'recording_producers',
    'recording_rights_holders'
  ]
  loop
    execute format(
      'create trigger enforce_catalog_tenant_integrity before insert or update on public.%I for each row execute function public.enforce_catalog_tenant_integrity()',
      table_name
    );
  end loop;
end
$$;

-- Ownership can be entered progressively, but it may never exceed 100%.
create or replace function public.validate_composition_ownership_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_composition_id uuid;
  total numeric;
begin
  target_composition_id := case when tg_op = 'DELETE' then old.composition_id else new.composition_id end;
  select
    coalesce((select sum(w.ownership_percentage) from public.composition_writers w where w.composition_id = target_composition_id), 0)
    + coalesce((select sum(p.ownership_percentage) from public.composition_publishers p where p.composition_id = target_composition_id), 0)
  into total;
  if total > 100.0000 then
    raise exception 'Composition ownership cannot exceed 100%% (current total: %)', total using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger validate_composition_writer_total
  after insert or update or delete on public.composition_writers
  deferrable initially deferred for each row
  execute function public.validate_composition_ownership_total();
create constraint trigger validate_composition_publisher_total
  after insert or update or delete on public.composition_publishers
  deferrable initially deferred for each row
  execute function public.validate_composition_ownership_total();

create or replace function public.validate_recording_composition_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_recording_id uuid;
  total numeric;
begin
  target_recording_id := case when tg_op = 'DELETE' then old.recording_id else new.recording_id end;
  select coalesce(sum(link.share_percentage), 0) into total
  from public.recording_compositions link
  where link.recording_id = target_recording_id;
  if total > 100.0000 then
    raise exception 'Recording-to-composition shares cannot exceed 100%% (current total: %)', total using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger validate_recording_composition_share_total
  after insert or update or delete on public.recording_compositions
  deferrable initially deferred for each row
  execute function public.validate_recording_composition_total();

create or replace function public.validate_master_ownership_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_recording_id uuid;
  target_territory text;
  total numeric;
begin
  if tg_op = 'DELETE' then
    target_recording_id := old.recording_id;
    target_territory := old.territory;
  else
    target_recording_id := new.recording_id;
    target_territory := new.territory;
  end if;
  select coalesce(sum(holder.ownership_percentage), 0) into total
  from public.recording_rights_holders holder
  where holder.recording_id = target_recording_id
    and holder.territory = target_territory
    and holder.rights_type = 'master_owner';
  if total > 100.0000 then
    raise exception 'Master ownership cannot exceed 100%% for territory % (current total: %)', target_territory, total using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger validate_master_ownership_share_total
  after insert or update or delete on public.recording_rights_holders
  deferrable initially deferred for each row
  execute function public.validate_master_ownership_total();

-- Secure every new tenant table with the same role model introduced by the
-- preceding authentication/multi-tenancy migration.
alter table public.member_roles enable row level security;
alter table public.compositions enable row level security;
alter table public.composition_writers enable row level security;
alter table public.composition_publishers enable row level security;
alter table public.recording_compositions enable row level security;
alter table public.recording_performers enable row level security;
alter table public.recording_producers enable row level security;
alter table public.recording_rights_holders enable row level security;

revoke all on table public.member_roles, public.compositions,
  public.composition_writers, public.composition_publishers,
  public.recording_compositions, public.recording_performers,
  public.recording_producers, public.recording_rights_holders from anon;

grant select, insert, update, delete on table public.member_roles, public.compositions,
  public.composition_writers, public.composition_publishers,
  public.recording_compositions, public.recording_performers,
  public.recording_producers, public.recording_rights_holders to authenticated;
grant all on table public.member_roles, public.compositions,
  public.composition_writers, public.composition_publishers,
  public.recording_compositions, public.recording_performers,
  public.recording_producers, public.recording_rights_holders to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'member_roles', 'compositions', 'composition_writers', 'composition_publishers',
    'recording_compositions', 'recording_performers', 'recording_producers',
    'recording_rights_holders'
  ]
  loop
    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated using ((select public.is_organization_member(organization_id)))',
      table_name
    );
    execute format(
      'create policy "tenant_delete_admin" on public.%I for delete to authenticated using ((select public.has_organization_role(organization_id, array[''admin'']::public.app_role[])))',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'compositions', 'composition_writers', 'composition_publishers',
    'recording_compositions', 'recording_performers', 'recording_producers',
    'recording_rights_holders'
  ]
  loop
    execute format(
      'create policy "tenant_insert_reviewer" on public.%I for insert to authenticated with check ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[])))',
      table_name
    );
    execute format(
      'create policy "tenant_update_reviewer" on public.%I for update to authenticated using ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[]))) with check ((select public.has_organization_role(organization_id, array[''admin'', ''reviewer'']::public.app_role[])))',
      table_name
    );
  end loop;
end
$$;

create policy "tenant_insert_roles" on public.member_roles for insert to authenticated
with check ((select public.has_organization_role(organization_id, array['admin', 'finance', 'reviewer']::public.app_role[])));
create policy "tenant_update_roles" on public.member_roles for update to authenticated
using ((select public.has_organization_role(organization_id, array['admin', 'finance', 'reviewer']::public.app_role[])))
with check ((select public.has_organization_role(organization_id, array['admin', 'finance', 'reviewer']::public.app_role[])));
create policy "tenant_delete_roles" on public.member_roles for delete to authenticated
using ((select public.has_organization_role(organization_id, array['admin', 'finance', 'reviewer']::public.app_role[])));

-- Stop new writes to the flawed mixed table while retaining SELECT for audit and
-- migration review.
revoke insert, update, delete on table public.recording_shares from authenticated;

revoke execute on function public.enforce_catalog_tenant_integrity() from public, anon, authenticated;
revoke execute on function public.sync_primary_member_role() from public, anon, authenticated;
revoke execute on function public.sync_catalog_relationship_capacity() from public, anon, authenticated;
revoke execute on function public.validate_composition_ownership_total() from public, anon, authenticated;
revoke execute on function public.validate_recording_composition_total() from public, anon, authenticated;
revoke execute on function public.validate_master_ownership_total() from public, anon, authenticated;

commit;

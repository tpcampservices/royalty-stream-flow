begin;

-- Licensees are customers/legal entities. Agreements, pricing and money
-- movements are normalized below instead of being stored on this record.
alter table public.licensees add column if not exists legal_name text;
alter table public.licensees add column if not exists registration_number text;
alter table public.licensees add column if not exists billing_email text;
alter table public.licensees add column if not exists country_code text;

comment on column public.licensees.licence_type is 'Deprecated legacy field; use public.licences.';
comment on column public.licensees.licence_number is 'Deprecated legacy field; use public.licences.';
comment on column public.licensees.licence_fee is 'Deprecated legacy field; use public.tariffs and public.licences.';
comment on column public.licensees.start_date is 'Deprecated legacy field; use public.licences.';
comment on column public.licensees.end_date is 'Deprecated legacy field; use public.licences.';

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code = upper(code) and code ~ '^[A-Z]{3}$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  symbol text not null check (char_length(symbol) between 1 and 8),
  decimal_places smallint not null default 2 check (decimal_places between 0 and 4),
  is_base boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create unique index currencies_one_base_per_organization_idx
  on public.currencies(organization_id) where is_base;

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  from_currency_id uuid not null references public.currencies(id) on delete restrict,
  to_currency_id uuid not null references public.currencies(id) on delete restrict,
  rate numeric(20,8) not null check (rate > 0),
  effective_date date not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_currency_id <> to_currency_id),
  unique (organization_id, from_currency_id, to_currency_id, effective_date)
);

create table public.tariffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (char_length(trim(code)) between 1 and 40),
  name text not null check (char_length(trim(name)) between 2 and 160),
  source_type text not null default 'radio',
  charging_basis text not null default 'flat'
    check (charging_basis in ('flat', 'percentage', 'per_unit', 'minimum_guarantee')),
  currency_id uuid not null references public.currencies(id) on delete restrict,
  flat_amount numeric(18,2) check (flat_amount is null or flat_amount >= 0),
  rate_percentage numeric(9,6) check (rate_percentage is null or (rate_percentage >= 0 and rate_percentage <= 100)),
  rate_per_unit numeric(18,6) check (rate_per_unit is null or rate_per_unit >= 0),
  minimum_fee numeric(18,2) not null default 0 check (minimum_fee >= 0),
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (
    (charging_basis = 'flat' and flat_amount is not null)
    or (charging_basis = 'percentage' and rate_percentage is not null)
    or (charging_basis = 'per_unit' and rate_per_unit is not null)
    or charging_basis = 'minimum_guarantee'
  ),
  unique (organization_id, code)
);

create table public.licences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  licensee_id uuid not null references public.licensees(id) on delete restrict,
  tariff_id uuid references public.tariffs(id) on delete restrict,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  licence_number text not null check (char_length(trim(licence_number)) between 1 and 80),
  licence_type text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'suspended', 'expired', 'terminated')),
  start_date date not null,
  end_date date,
  billing_frequency text not null default 'annually'
    check (billing_frequency in ('one_off', 'monthly', 'quarterly', 'annually')),
  agreed_fee numeric(18,2) check (agreed_fee is null or agreed_fee >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (organization_id, licence_number)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  licence_id uuid not null references public.licences(id) on delete restrict,
  invoice_number text not null check (char_length(trim(invoice_number)) between 1 and 80),
  issue_date date not null,
  due_date date not null,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(18,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(18,2) not null default 0 check (balance_due >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'part_paid', 'paid', 'overdue', 'void')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= issue_date),
  unique (organization_id, invoice_number)
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  tariff_id uuid references public.tariffs(id) on delete restrict,
  description text not null check (char_length(trim(description)) between 1 and 500),
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  tax_rate numeric(9,6) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  line_subtotal numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  tax_amount numeric(18,2) generated always as (round(round(quantity * unit_price, 2) * tax_rate / 100, 2)) stored,
  line_total numeric(18,2) generated always as (
    round(quantity * unit_price, 2) + round(round(quantity * unit_price, 2) * tax_rate / 100, 2)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Collections are incoming money from licensees. They are deliberately separate
-- from public.payments, which represents outgoing royalties to rights parties.
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  licensee_id uuid not null references public.licensees(id) on delete restrict,
  collection_date date not null,
  amount numeric(18,2) not null check (amount > 0),
  currency_id uuid not null references public.currencies(id) on delete restrict,
  exchange_rate_to_base numeric(20,8) not null default 1 check (exchange_rate_to_base > 0),
  base_amount numeric(18,2) generated always as (round(amount * exchange_rate_to_base, 2)) stored,
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer', 'cash', 'cheque', 'card', 'online', 'other')),
  reference text,
  status text not null default 'pending' check (status in ('pending', 'cleared', 'reversed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  collection_id uuid not null references public.collections(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  collection_amount numeric(18,2) not null check (collection_amount > 0),
  invoice_amount numeric(18,2) not null check (invoice_amount > 0),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, invoice_id),
  check (abs(invoice_amount - round(collection_amount * exchange_rate, 2)) <= 0.01)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  collection_id uuid not null unique references public.collections(id) on delete restrict,
  receipt_number text not null check (char_length(trim(receipt_number)) between 1 and 80),
  issued_at timestamptz not null default now(),
  status text not null default 'issued' check (status in ('issued', 'void')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);

alter table public.pools add column if not exists currency_id uuid references public.currencies(id) on delete restrict;
alter table public.payments add column if not exists currency_id uuid references public.currencies(id) on delete restrict;

create table public.pool_deductions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  pool_id uuid not null references public.pools(id) on delete cascade,
  category text not null check (category in ('administration', 'tax', 'bank_fee', 'social_cultural', 'adjustment', 'other')),
  description text not null check (char_length(trim(description)) between 1 and 500),
  amount numeric(18,2) not null check (amount > 0),
  currency_id uuid not null references public.currencies(id) on delete restrict,
  exchange_rate_to_base numeric(20,8) not null default 1 check (exchange_rate_to_base > 0),
  base_amount numeric(18,2) generated always as (round(amount * exchange_rate_to_base, 2)) stored,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  reference text,
  incurred_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pool_collection_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  collection_id uuid not null references public.collections(id) on delete restrict,
  pool_id uuid not null references public.pools(id) on delete cascade,
  amount_base numeric(18,2) not null check (amount_base > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, pool_id)
);

create table public.pool_reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  pool_id uuid not null unique references public.pools(id) on delete cascade,
  collections_total numeric(18,2) not null default 0,
  deductions_total numeric(18,2) not null default 0,
  net_distributable numeric(18,2) not null default 0,
  variance numeric(18,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'reconciled', 'locked')),
  reconciled_at timestamptz,
  reconciled_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every organization starts with Trinidad and Tobago dollars as its base
-- currency. More currencies and rates can be added by finance users.
insert into public.currencies (organization_id, code, name, symbol, is_base)
select organization.id, 'TTD', 'Trinidad and Tobago Dollar', 'TT$', true
from public.organizations organization
on conflict (organization_id, code) do nothing;

create or replace function public.seed_organization_base_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.currencies (organization_id, code, name, symbol, is_base)
  values (new.id, 'TTD', 'Trinidad and Tobago Dollar', 'TT$', true)
  on conflict (organization_id, code) do nothing;
  return new;
end;
$$;

create trigger seed_organization_base_currency
  after insert on public.organizations
  for each row execute function public.seed_organization_base_currency();

update public.pools pool
set currency_id = currency.id
from public.currencies currency
where currency.organization_id = pool.organization_id
  and currency.is_base
  and pool.currency_id is null;

update public.payments payment
set currency_id = coalesce(
  (select pool.currency_id from public.pools pool where pool.id = payment.pool_id),
  (select currency.id from public.currencies currency
   where currency.organization_id = payment.organization_id and currency.is_base)
)
where payment.currency_id is null and payment.organization_id is not null;

create or replace function public.assign_base_currency_when_missing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is not null and new.currency_id is null then
    select currency.id into new.currency_id
    from public.currencies currency
    where currency.organization_id = new.organization_id and currency.is_base;
  end if;
  return new;
end;
$$;

create trigger assign_base_currency_when_missing
  before insert or update on public.pools
  for each row execute function public.assign_base_currency_when_missing();
create trigger assign_base_currency_when_missing
  before insert or update on public.payments
  for each row execute function public.assign_base_currency_when_missing();

-- Preserve every old agreement as a normalized licence. Duplicate legacy
-- numbers receive a stable suffix rather than causing a migration failure.
with legacy as (
  select
    licensee.*,
    count(*) over (partition by organization_id, nullif(trim(licence_number), '')) as number_count
  from public.licensees licensee
  where organization_id is not null
    and (
      licence_number is not null or licence_type is not null or licence_fee <> 0
      or start_date is not null or end_date is not null
    )
)
insert into public.licences (
  organization_id, licensee_id, currency_id, licence_number, licence_type,
  status, start_date, end_date, billing_frequency, agreed_fee, notes
)
select
  legacy.organization_id,
  legacy.id,
  currency.id,
  case
    when nullif(trim(legacy.licence_number), '') is null then 'LEGACY-' || upper(left(replace(legacy.id::text, '-', ''), 10))
    when legacy.number_count > 1 then left(trim(legacy.licence_number), 72) || '-' || upper(left(replace(legacy.id::text, '-', ''), 6))
    else left(trim(legacy.licence_number), 80)
  end,
  coalesce(nullif(trim(legacy.licence_type), ''), 'Legacy licence'),
  case when legacy.status in ('active', 'suspended', 'expired') then legacy.status else 'draft' end,
  coalesce(legacy.start_date, legacy.created_at::date),
  case
    when legacy.end_date is null or legacy.end_date >= coalesce(legacy.start_date, legacy.created_at::date) then legacy.end_date
    else null
  end,
  'annually',
  legacy.licence_fee,
  'Migrated from the legacy licensee record. Review tariff and billing terms.'
from legacy
join public.currencies currency
  on currency.organization_id = legacy.organization_id and currency.is_base;

-- Authentication rollout intentionally leaves old rows tenantless until an
-- administrator assigns them. Normalize a legacy agreement when that explicit
-- assignment happens after this migration has already run.
create or replace function public.normalize_legacy_licensee_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_currency_id uuid;
  candidate_number text;
  normalized_start date;
begin
  if old.organization_id is not null or new.organization_id is null then
    return new;
  end if;
  if new.licence_number is null and new.licence_type is null and new.licence_fee = 0
     and new.start_date is null and new.end_date is null then
    return new;
  end if;
  if exists (select 1 from public.licences l where l.licensee_id = new.id) then
    return new;
  end if;

  select currency.id into base_currency_id
  from public.currencies currency
  where currency.organization_id = new.organization_id and currency.is_base;
  if base_currency_id is null then
    raise exception 'Organization base currency is required before legacy licence conversion' using errcode = '23514';
  end if;

  candidate_number := coalesce(
    nullif(left(trim(new.licence_number), 80), ''),
    'LEGACY-' || upper(left(replace(new.id::text, '-', ''), 10))
  );
  if exists (
    select 1 from public.licences l
    where l.organization_id = new.organization_id and l.licence_number = candidate_number
  ) then
    candidate_number := left(candidate_number, 72) || '-' || upper(left(replace(new.id::text, '-', ''), 6));
  end if;
  normalized_start := coalesce(new.start_date, new.created_at::date);

  insert into public.licences (
    organization_id, licensee_id, currency_id, licence_number, licence_type,
    status, start_date, end_date, billing_frequency, agreed_fee, notes
  )
  values (
    new.organization_id,
    new.id,
    base_currency_id,
    candidate_number,
    coalesce(nullif(trim(new.licence_type), ''), 'Legacy licence'),
    case when new.status in ('active', 'suspended', 'expired') then new.status else 'draft' end,
    normalized_start,
    case when new.end_date is null or new.end_date >= normalized_start then new.end_date else null end,
    'annually',
    new.licence_fee,
    'Migrated from the legacy licensee record after tenant assignment. Review tariff and billing terms.'
  );
  return new;
end;
$$;

create trigger normalize_legacy_licensee_on_assignment
  after update of organization_id on public.licensees
  for each row execute function public.normalize_legacy_licensee_on_assignment();

create index currencies_organization_id_idx on public.currencies(organization_id);
create index exchange_rates_organization_id_idx on public.exchange_rates(organization_id);
create index tariffs_organization_id_idx on public.tariffs(organization_id);
create index licences_organization_id_idx on public.licences(organization_id);
create index licences_licensee_id_idx on public.licences(licensee_id);
create index invoices_organization_id_idx on public.invoices(organization_id);
create index invoices_licence_id_idx on public.invoices(licence_id);
create index invoice_lines_organization_id_idx on public.invoice_lines(organization_id);
create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);
create index collections_organization_id_idx on public.collections(organization_id);
create index collections_licensee_id_idx on public.collections(licensee_id);
create index collection_allocations_organization_id_idx on public.collection_allocations(organization_id);
create index collection_allocations_invoice_id_idx on public.collection_allocations(invoice_id);
create index receipts_organization_id_idx on public.receipts(organization_id);
create index pool_deductions_organization_id_idx on public.pool_deductions(organization_id);
create index pool_deductions_pool_id_idx on public.pool_deductions(pool_id);
create index pool_collection_allocations_organization_id_idx on public.pool_collection_allocations(organization_id);
create index pool_collection_allocations_pool_id_idx on public.pool_collection_allocations(pool_id);
create index pool_reconciliations_organization_id_idx on public.pool_reconciliations(organization_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'currencies', 'exchange_rates', 'tariffs', 'licences', 'invoices', 'invoice_lines',
    'collections', 'collection_allocations', 'receipts', 'pool_deductions',
    'pool_collection_allocations', 'pool_reconciliations'
  ]
  loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.update_updated_at_column()',
      table_name, table_name
    );
  end loop;
end
$$;

-- Enforce tenant ownership for every relationship even when calls are made
-- directly to the Data API rather than through this application.
create or replace function public.enforce_finance_tenant_integrity()
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

  if row_data ? 'currency_id' then
    reference_id := nullif(row_data ->> 'currency_id', '')::uuid;
    if reference_id is not null and not exists (
      select 1 from public.currencies currency where currency.id = reference_id and currency.organization_id = tenant_id
    ) then
      raise exception 'Currency must belong to the same organization' using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'exchange_rates' then
    reference_id := nullif(row_data ->> 'from_currency_id', '')::uuid;
    if not exists (select 1 from public.currencies c where c.id = reference_id and c.organization_id = tenant_id) then
      raise exception 'Source currency must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'to_currency_id', '')::uuid;
    if not exists (select 1 from public.currencies c where c.id = reference_id and c.organization_id = tenant_id) then
      raise exception 'Target currency must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'licences' then
    reference_id := nullif(row_data ->> 'licensee_id', '')::uuid;
    if not exists (select 1 from public.licensees l where l.id = reference_id and l.organization_id = tenant_id) then
      raise exception 'Licensee must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'tariff_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.tariffs t where t.id = reference_id and t.organization_id = tenant_id) then
      raise exception 'Tariff must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'invoices' then
    reference_id := nullif(row_data ->> 'licence_id', '')::uuid;
    if not exists (select 1 from public.licences l where l.id = reference_id and l.organization_id = tenant_id) then
      raise exception 'Licence must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'invoice_lines' then
    reference_id := nullif(row_data ->> 'invoice_id', '')::uuid;
    if not exists (select 1 from public.invoices i where i.id = reference_id and i.organization_id = tenant_id and i.status <> 'void') then
      raise exception 'Invoice must be open and belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'tariff_id', '')::uuid;
    if reference_id is not null and not exists (select 1 from public.tariffs t where t.id = reference_id and t.organization_id = tenant_id) then
      raise exception 'Tariff must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'collections' then
    reference_id := nullif(row_data ->> 'licensee_id', '')::uuid;
    if not exists (select 1 from public.licensees l where l.id = reference_id and l.organization_id = tenant_id) then
      raise exception 'Licensee must belong to the same organization' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and old.status = 'cleared' and new.status <> 'cleared' then
      if exists (select 1 from public.receipts r where r.collection_id = new.id and r.status = 'issued') then
        raise exception 'Void the issued receipt before reversing this collection' using errcode = '23514';
      end if;
      if exists (
        select 1
        from public.pool_collection_allocations allocation
        join public.pool_reconciliations reconciliation on reconciliation.pool_id = allocation.pool_id
        where allocation.collection_id = new.id and reconciliation.status = 'locked'
      ) then
        raise exception 'A collection in a locked pool reconciliation cannot be reversed' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'collection_allocations' then
    reference_id := nullif(row_data ->> 'collection_id', '')::uuid;
    if not exists (
      select 1 from public.collections c
      where c.id = reference_id and c.organization_id = tenant_id and c.status = 'cleared'
    ) then
      raise exception 'Only a cleared collection in the same organization can be allocated' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'invoice_id', '')::uuid;
    if not exists (select 1 from public.invoices i where i.id = reference_id and i.organization_id = tenant_id and i.status <> 'void') then
      raise exception 'Invoice must be open and belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'receipts' then
    reference_id := nullif(row_data ->> 'collection_id', '')::uuid;
    if not exists (
      select 1 from public.collections c
      where c.id = reference_id and c.organization_id = tenant_id and c.status = 'cleared'
    ) then
      raise exception 'Receipts can only be issued for a cleared collection in the same organization' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and old.status = 'void' and new.status <> 'void' then
      raise exception 'A void receipt cannot be reissued' using errcode = '23514';
    end if;
  elsif tg_table_name = 'pool_deductions' then
    reference_id := nullif(row_data ->> 'pool_id', '')::uuid;
    if not exists (select 1 from public.pools p where p.id = reference_id and p.organization_id = tenant_id) then
      raise exception 'Pool must belong to the same organization' using errcode = '23514';
    end if;
  elsif tg_table_name = 'pool_collection_allocations' then
    reference_id := nullif(row_data ->> 'pool_id', '')::uuid;
    if not exists (select 1 from public.pools p where p.id = reference_id and p.organization_id = tenant_id) then
      raise exception 'Pool must belong to the same organization' using errcode = '23514';
    end if;
    reference_id := nullif(row_data ->> 'collection_id', '')::uuid;
    if not exists (
      select 1 from public.collections c
      where c.id = reference_id and c.organization_id = tenant_id and c.status = 'cleared'
    ) then
      raise exception 'Only a cleared collection in the same organization can be pooled' using errcode = '23514';
    end if;
  elsif tg_table_name = 'pool_reconciliations' then
    reference_id := nullif(row_data ->> 'pool_id', '')::uuid;
    if not exists (select 1 from public.pools p where p.id = reference_id and p.organization_id = tenant_id) then
      raise exception 'Pool must belong to the same organization' using errcode = '23514';
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
    'currencies', 'exchange_rates', 'tariffs', 'licences', 'invoices', 'invoice_lines',
    'collections', 'collection_allocations', 'receipts', 'pool_deductions',
    'pool_collection_allocations', 'pool_reconciliations', 'pools', 'payments'
  ]
  loop
    execute format(
      'create trigger enforce_finance_tenant_integrity before insert or update on public.%I for each row execute function public.enforce_finance_tenant_integrity()',
      table_name
    );
  end loop;
end
$$;

create or replace function public.refresh_invoice_totals(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  line_subtotal numeric(18,2);
  line_tax numeric(18,2);
  paid numeric(18,2);
begin
  select coalesce(sum(line.line_subtotal), 0), coalesce(sum(line.tax_amount), 0)
  into line_subtotal, line_tax
  from public.invoice_lines line
  where line.invoice_id = target_invoice_id;

  select coalesce(sum(allocation.invoice_amount), 0)
  into paid
  from public.collection_allocations allocation
  join public.collections collection on collection.id = allocation.collection_id
  where allocation.invoice_id = target_invoice_id
    and collection.status = 'cleared';

  update public.invoices invoice
  set subtotal = line_subtotal,
      tax_amount = line_tax,
      total_amount = line_subtotal + line_tax,
      amount_paid = paid,
      balance_due = greatest(line_subtotal + line_tax - paid, 0),
      status = case
        when invoice.status = 'void' then 'void'
        when paid >= line_subtotal + line_tax and line_subtotal + line_tax > 0 then 'paid'
        when paid > 0 then 'part_paid'
        when invoice.due_date < current_date and line_subtotal + line_tax > 0 then 'overdue'
        when invoice.status = 'draft' then 'draft'
        else 'issued'
      end
  where invoice.id = target_invoice_id;
end;
$$;

create or replace function public.sync_invoice_from_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_invoice_totals(case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end);
  if tg_op = 'UPDATE' and old.invoice_id <> new.invoice_id then
    perform public.refresh_invoice_totals(old.invoice_id);
  end if;
  return null;
end;
$$;

create trigger sync_invoice_from_lines
  after insert or update or delete on public.invoice_lines
  for each row execute function public.sync_invoice_from_lines();

create trigger sync_invoice_from_allocations
  after insert or update or delete on public.collection_allocations
  for each row execute function public.sync_invoice_from_lines();

create or replace function public.sync_invoices_from_collection_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row record;
begin
  if old.status is distinct from new.status then
    for invoice_row in
      select distinct allocation.invoice_id
      from public.collection_allocations allocation
      where allocation.collection_id = new.id
    loop
      perform public.refresh_invoice_totals(invoice_row.invoice_id);
    end loop;
    update public.pool_reconciliations reconciliation
    set status = 'draft', reconciled_at = null, reconciled_by = null
    where reconciliation.status = 'reconciled'
      and exists (
        select 1 from public.pool_collection_allocations allocation
        where allocation.collection_id = new.id and allocation.pool_id = reconciliation.pool_id
      );
  end if;
  return null;
end;
$$;

create trigger sync_invoices_from_collection_status
  after update of status on public.collections
  for each row execute function public.sync_invoices_from_collection_status();

create or replace function public.validate_invoice_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'void' and new.status <> 'void' then
    raise exception 'A void invoice cannot be reopened' using errcode = '23514';
  end if;
  if new.status = 'void' and old.status <> 'void' and exists (
    select 1 from public.collection_allocations allocation where allocation.invoice_id = new.id
  ) then
    raise exception 'Remove collection allocations before voiding this invoice' using errcode = '23514';
  end if;
  if new.status = 'paid' and not (new.total_amount > 0 and new.amount_paid >= new.total_amount) then
    raise exception 'An invoice is paid only when cleared allocations cover its total' using errcode = '23514';
  end if;
  if new.status = 'part_paid' and not (new.amount_paid > 0 and new.amount_paid < new.total_amount) then
    raise exception 'Part-paid status must match cleared allocations' using errcode = '23514';
  end if;
  if new.status = 'overdue' and not (new.due_date < current_date and new.balance_due > 0) then
    raise exception 'Overdue status must match the due date and balance' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_invoice_status
  before update of status on public.invoices
  for each row execute function public.validate_invoice_status();

create or replace function public.validate_collection_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_collection_id uuid := case when tg_op = 'DELETE' then old.collection_id else new.collection_id end;
  target_invoice_id uuid := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  allocated_collection numeric(18,2);
  collection_total numeric(18,2);
  allocated_invoice numeric(18,2);
  invoice_total numeric(18,2);
begin
  select coalesce(sum(a.collection_amount), 0) into allocated_collection
  from public.collection_allocations a where a.collection_id = target_collection_id;
  select c.amount into collection_total from public.collections c where c.id = target_collection_id;
  if allocated_collection > collection_total then
    raise exception 'Invoice allocations cannot exceed the collection amount' using errcode = '23514';
  end if;

  select coalesce(sum(a.invoice_amount), 0) into allocated_invoice
  from public.collection_allocations a where a.invoice_id = target_invoice_id;
  select i.total_amount into invoice_total from public.invoices i where i.id = target_invoice_id;
  if allocated_invoice > invoice_total then
    raise exception 'Collections cannot exceed the invoice total' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger validate_collection_allocations
  after insert or update or delete on public.collection_allocations
  deferrable initially deferred for each row
  execute function public.validate_collection_allocations();

create or replace function public.validate_pool_collection_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_collection_id uuid := case when tg_op = 'DELETE' then old.collection_id else new.collection_id end;
  allocated numeric(18,2);
  available numeric(18,2);
begin
  select coalesce(sum(a.amount_base), 0) into allocated
  from public.pool_collection_allocations a where a.collection_id = target_collection_id;
  select c.base_amount into available from public.collections c where c.id = target_collection_id;
  if allocated > available then
    raise exception 'Pool allocations cannot exceed the collection base amount' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger validate_pool_collection_allocations
  after insert or update or delete on public.pool_collection_allocations
  deferrable initially deferred for each row
  execute function public.validate_pool_collection_allocations();

create or replace function public.guard_locked_pool_reconciliation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_pool_id uuid := case when tg_op = 'INSERT' then new.pool_id else old.pool_id end;
begin
  if exists (
    select 1 from public.pool_reconciliations reconciliation
    where reconciliation.pool_id = target_pool_id and reconciliation.status = 'locked'
  ) then
    raise exception 'This pool reconciliation is locked' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.pool_id <> old.pool_id and exists (
    select 1 from public.pool_reconciliations reconciliation
    where reconciliation.pool_id = new.pool_id and reconciliation.status = 'locked'
  ) then
    raise exception 'The target pool reconciliation is locked' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger guard_locked_pool_deductions
  before insert or update or delete on public.pool_deductions
  for each row execute function public.guard_locked_pool_reconciliation();
create trigger guard_locked_pool_allocations
  before insert or update or delete on public.pool_collection_allocations
  for each row execute function public.guard_locked_pool_reconciliation();

create or replace function public.mark_pool_reconciliation_dirty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pool_id uuid := case when tg_op = 'DELETE' then old.pool_id else new.pool_id end;
begin
  update public.pool_reconciliations
  set status = 'draft', reconciled_at = null, reconciled_by = null
  where pool_id = target_pool_id and status = 'reconciled';
  if tg_op = 'UPDATE' and old.pool_id <> new.pool_id then
    update public.pool_reconciliations
    set status = 'draft', reconciled_at = null, reconciled_by = null
    where pool_id = old.pool_id and status = 'reconciled';
  end if;
  return null;
end;
$$;

create trigger mark_reconciliation_dirty_from_deduction
  after insert or update or delete on public.pool_deductions
  for each row execute function public.mark_pool_reconciliation_dirty();
create trigger mark_reconciliation_dirty_from_allocation
  after insert or update or delete on public.pool_collection_allocations
  for each row execute function public.mark_pool_reconciliation_dirty();

create or replace function public.guard_base_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_base then
    raise exception 'The organization base currency cannot be removed or unset' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.is_base and not new.is_base then
    raise exception 'The organization base currency cannot be removed or unset' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger guard_base_currency
  before update or delete on public.currencies
  for each row execute function public.guard_base_currency();

-- Reconciliation is the only supported path for updating a pool's financial
-- totals. It uses cleared collection allocations and approved deductions.
create or replace function public.reconcile_pool(target_pool_id uuid, lock_result boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pool public.pools%rowtype;
  gross numeric(18,2);
  deducted numeric(18,2);
  reconciliation_id uuid;
  reconciliation_status text;
begin
  select * into target_pool from public.pools pool where pool.id = target_pool_id for update;
  if target_pool.id is null then
    raise exception 'Pool not found';
  end if;
  if not public.has_organization_role(target_pool.organization_id, array['admin', 'finance']::public.app_role[]) then
    raise exception 'Only organization admins and finance users can reconcile pools' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.pool_reconciliations r where r.pool_id = target_pool_id and r.status = 'locked'
  ) then
    raise exception 'This pool reconciliation is already locked' using errcode = '23514';
  end if;
  if target_pool.currency_id is null or not exists (
    select 1 from public.currencies c
    where c.id = target_pool.currency_id and c.organization_id = target_pool.organization_id and c.is_base
  ) then
    raise exception 'Distribution pools must use the organization base currency' using errcode = '23514';
  end if;

  select coalesce(sum(allocation.amount_base), 0)
  into gross
  from public.pool_collection_allocations allocation
  join public.collections collection on collection.id = allocation.collection_id
  where allocation.pool_id = target_pool_id and collection.status = 'cleared';

  select coalesce(sum(deduction.base_amount), 0)
  into deducted
  from public.pool_deductions deduction
  where deduction.pool_id = target_pool_id and deduction.status = 'approved';

  if deducted > gross then
    raise exception 'Approved deductions cannot exceed cleared pool collections' using errcode = '23514';
  end if;

  reconciliation_status := case when lock_result then 'locked' else 'reconciled' end;
  insert into public.pool_reconciliations (
    organization_id, pool_id, collections_total, deductions_total, net_distributable,
    variance, status, reconciled_at, reconciled_by
  )
  values (
    target_pool.organization_id, target_pool.id, gross, deducted, gross - deducted,
    gross - target_pool.gross_amount, reconciliation_status, now(), auth.uid()
  )
  on conflict (pool_id) do update
    set collections_total = excluded.collections_total,
        deductions_total = excluded.deductions_total,
        net_distributable = excluded.net_distributable,
        variance = excluded.variance,
        status = excluded.status,
        reconciled_at = excluded.reconciled_at,
        reconciled_by = excluded.reconciled_by,
        updated_at = now()
  returning id into reconciliation_id;

  update public.pools
  set gross_amount = gross,
      deductions = deducted,
      net_amount = gross - deducted
  where id = target_pool_id;

  return reconciliation_id;
end;
$$;

alter table public.currencies enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.tariffs enable row level security;
alter table public.licences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.collections enable row level security;
alter table public.collection_allocations enable row level security;
alter table public.receipts enable row level security;
alter table public.pool_deductions enable row level security;
alter table public.pool_collection_allocations enable row level security;
alter table public.pool_reconciliations enable row level security;

revoke all on table public.currencies, public.exchange_rates, public.tariffs,
  public.licences, public.invoices, public.invoice_lines, public.collections,
  public.collection_allocations, public.receipts, public.pool_deductions,
  public.pool_collection_allocations, public.pool_reconciliations from anon;

grant select, insert, update, delete on table public.currencies, public.exchange_rates,
  public.tariffs, public.licences, public.invoices, public.invoice_lines,
  public.collections, public.collection_allocations, public.receipts,
  public.pool_deductions, public.pool_collection_allocations,
  public.pool_reconciliations to authenticated;
grant all on table public.currencies, public.exchange_rates, public.tariffs,
  public.licences, public.invoices, public.invoice_lines, public.collections,
  public.collection_allocations, public.receipts, public.pool_deductions,
  public.pool_collection_allocations, public.pool_reconciliations to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'currencies', 'exchange_rates', 'tariffs', 'licences', 'invoices', 'invoice_lines',
    'collections', 'collection_allocations', 'receipts', 'pool_deductions',
    'pool_collection_allocations', 'pool_reconciliations'
  ]
  loop
    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated using ((select public.is_organization_member(organization_id)))',
      table_name
    );
    execute format(
      'create policy "tenant_insert_finance" on public.%I for insert to authenticated with check ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[])))',
      table_name
    );
    execute format(
      'create policy "tenant_update_finance" on public.%I for update to authenticated using ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[]))) with check ((select public.has_organization_role(organization_id, array[''admin'', ''finance'']::public.app_role[])))',
      table_name
    );
    execute format(
      'create policy "tenant_delete_admin" on public.%I for delete to authenticated using ((select public.has_organization_role(organization_id, array[''admin'']::public.app_role[])))',
      table_name
    );
  end loop;
end
$$;

-- Generated balances and reconciliation snapshots are maintained by triggers or
-- the reconciliation RPC, not trusted from client input.
revoke insert, update on public.invoices from authenticated;
grant insert (organization_id, licence_id, invoice_number, issue_date, due_date, currency_id, status, notes) on public.invoices to authenticated;
grant update (licence_id, invoice_number, issue_date, due_date, currency_id, status, notes) on public.invoices to authenticated;
revoke insert, update, delete on public.pool_reconciliations from authenticated;
revoke insert, update on public.pools from authenticated;
grant insert (organization_id, name, source_type, period, status, rights_domain, currency_id, total_weighted_points, point_value) on public.pools to authenticated;
grant update (name, source_type, period, status, rights_domain, currency_id, total_weighted_points, point_value) on public.pools to authenticated;

revoke execute on function public.seed_organization_base_currency() from public, anon, authenticated;
revoke execute on function public.assign_base_currency_when_missing() from public, anon, authenticated;
revoke execute on function public.normalize_legacy_licensee_on_assignment() from public, anon, authenticated;
revoke execute on function public.enforce_finance_tenant_integrity() from public, anon, authenticated;
revoke execute on function public.refresh_invoice_totals(uuid) from public, anon, authenticated;
revoke execute on function public.sync_invoice_from_lines() from public, anon, authenticated;
revoke execute on function public.sync_invoices_from_collection_status() from public, anon, authenticated;
revoke execute on function public.validate_invoice_status() from public, anon, authenticated;
revoke execute on function public.validate_collection_allocations() from public, anon, authenticated;
revoke execute on function public.validate_pool_collection_allocations() from public, anon, authenticated;
revoke execute on function public.guard_locked_pool_reconciliation() from public, anon, authenticated;
revoke execute on function public.mark_pool_reconciliation_dirty() from public, anon, authenticated;
revoke execute on function public.guard_base_currency() from public, anon, authenticated;
revoke execute on function public.reconcile_pool(uuid, boolean) from public, anon;
grant execute on function public.reconcile_pool(uuid, boolean) to authenticated;

commit;

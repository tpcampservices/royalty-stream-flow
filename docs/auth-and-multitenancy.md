# Authentication and multi-tenancy rollout

This change adds Supabase email/password authentication, protected application routes, organization-scoped roles, and database-enforced tenant isolation.

## Role matrix

| Area | Admin | Finance | Reviewer |
| --- | --- | --- | --- |
| Dashboard and reports | Read | Read | Read |
| Members, licensees, pools, payments | Create/read/update/delete | Create/read/update | Read through related workflows only |
| Payment/bank details | Create/read/update/delete | Create/read/update | No access |
| Recordings, shares, weighting, usage | Create/read/update/delete | Read through reports only | Create/read/update |
| Calculations | Full access | No route access | No route access |
| Team and roles | Manage | No access | No access |

The route guards improve the user experience, but PostgreSQL grants and RLS are the security boundary. Every business query is also filtered by `organization_id` for safer and faster query plans.

## Deployment sequence

1. Review and apply `supabase/migrations/20260816010000_auth_roles_multitenancy.sql` to the linked Supabase project.
2. In Supabase Auth settings, confirm Email authentication is enabled and add the production application URL to the allowed redirect URLs.
3. Create the first account in the app. After email confirmation, sign in and create the organization; that user becomes its first Admin.
4. If the database already contains business data, perform the explicit legacy backfill below while using the Supabase SQL Editor as a database administrator.
5. Add Finance and Reviewer users from **Team & Roles** after each person has created their own account.

## Existing-data backfill

The migration deliberately leaves existing rows with `organization_id = NULL`. RLS makes those rows invisible, preventing the first person who signs in from accidentally or maliciously claiming all historical data.

First find the intended organization:

```sql
select id, name, slug from public.organizations order by created_at;
```

After verifying the organization UUID, run the following in dependency order, replacing `YOUR_ORGANIZATION_UUID`:

```sql
begin;

update public.members set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.sound_recordings set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.licensees set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.weighting_rules set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.pools set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;

update public.recording_shares set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.usage_logs set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.payments set organization_id = 'YOUR_ORGANIZATION_UUID' where organization_id is null;
update public.member_payment_details details
set organization_id = members.organization_id
from public.members members
where details.member_id = members.id and details.organization_id is null;

commit;
```

Verify nothing remains unassigned:

```sql
select 'members' as table_name, count(*) from public.members where organization_id is null
union all select 'sound_recordings', count(*) from public.sound_recordings where organization_id is null
union all select 'recording_shares', count(*) from public.recording_shares where organization_id is null
union all select 'licensees', count(*) from public.licensees where organization_id is null
union all select 'weighting_rules', count(*) from public.weighting_rules where organization_id is null
union all select 'pools', count(*) from public.pools where organization_id is null
union all select 'usage_logs', count(*) from public.usage_logs where organization_id is null
union all select 'payments', count(*) from public.payments where organization_id is null
union all select 'member_payment_details', count(*) from public.member_payment_details where organization_id is null;
```

Once every count is zero, a later hardening migration can make each `organization_id` column `NOT NULL`. Do not apply that constraint before the legacy assignment is verified.

## Security notes

- Organization roles are stored in `organization_members`, not user-editable Auth metadata.
- Anonymous table access and the previous `USING (true)` policies are removed.
- Admin-only database functions validate the caller and protect the last Admin from removal or demotion.
- Bank account data is moved to `member_payment_details`, which Reviewers cannot select.
- Tenant-integrity triggers prevent changing assigned ownership and reject cross-organization relationships.
- Security-definer functions use an empty `search_path` and explicit execution grants.

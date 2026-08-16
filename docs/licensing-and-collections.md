# Licensing and collections

This model separates customers, licence agreements, incoming collections and outgoing royalty payments. It also makes distribution-pool totals reproducible from an audit trail instead of accepting manually entered totals.

## Record flow

| Stage | Tables | Rule |
| --- | --- | --- |
| Customer | `licensees` | One legal/trading entity can hold several licences. Legacy licence fields remain only for migration history. |
| Pricing | `tariffs`, `currencies`, `exchange_rates` | A tariff has an effective period, charging basis and currency. Each organization has exactly one base currency. |
| Agreement | `licences` | Links a licensee to optional tariff terms, billing currency, licence period and status. |
| Billing | `invoices`, `invoice_lines` | Invoice subtotal, tax, total, paid amount and balance are calculated by the database from lines and cleared allocations. |
| Money received | `collections`, `collection_allocations`, `receipts` | Collections are incoming money. A cleared collection can be split across invoices, and a receipt can only be issued once per cleared collection. |
| Distribution funding | `pool_collection_allocations` | Cleared collection value, converted to base currency, can be allocated across distribution pools without exceeding the collection. |
| Deductions | `pool_deductions` | Only approved deductions enter a reconciliation. Original currency, exchange rate and base amount are retained. |
| Reconciliation | `pool_reconciliations` | The `reconcile_pool` function derives gross, deductions and net. A locked reconciliation rejects later funding or deduction changes. |
| Money paid out | `payments` | Existing payments remain outgoing royalty payments to rights parties and are not mixed with incoming collections. |

## Financial controls

- Original-currency and base-currency values are both retained. Exchange rates are explicit and must be positive.
- Invoice allocations cannot exceed either the collection received or the invoice total.
- Pool allocations cannot exceed the cleared collection's base-currency amount.
- Receipts cannot be issued against pending or reversed collections.
- Approved deductions cannot exceed the cleared money allocated to a pool.
- Pool gross, deduction and net columns are no longer client-editable; reconciliation writes them atomically.
- Admin and Finance roles can create and update licensing/collection records. Every organization member can read them through RLS, and only Admin can delete them.
- Cross-organization references are rejected by database triggers even if a request bypasses the app.

## Legacy conversion

Migration `20260816030000_licensing_collections.sql` keeps every existing licensee and creates a normalized `licences` row when the legacy record contains agreement data. Duplicate licence numbers receive a stable suffix. Migrated agreements use the organization's seeded TTD base currency and are marked for tariff/term review in their notes.

Existing pool and royalty-payment rows receive the organization's base currency where tenant ownership was already assigned. Rows that still have `organization_id = NULL` remain inaccessible until the documented tenant backfill. Assignment triggers then create the normalized legacy licence and attach the organization's base currency to pools and royalty payments.

## Deployment dependency

Apply migrations in filename order:

1. `20260816010000_auth_roles_multitenancy.sql`
2. `20260816020000_rights_catalog_model.sql`
3. `20260816030000_licensing_collections.sql`

The third migration depends on organization roles and the rights-domain field introduced by the first two. Committing or merging these files does not execute them in Lovable Cloud.

## Acceptance checks after deployment

1. Create a non-base currency and an exchange rate to TTD.
2. Create a tariff, licensee, licence and invoice with at least two invoice lines.
3. Confirm invoice total and tax are calculated without typing the totals.
4. Record and clear a partial collection, allocate it to the invoice and issue its receipt.
5. Allocate the collection's base value to a pool, add and approve a deduction, then reconcile.
6. Confirm pool gross equals cleared pool allocations, net equals gross less approved deductions, and the invoice balance reflects only cleared allocations.
7. Lock the reconciliation and confirm later pool allocation or deduction changes are rejected.

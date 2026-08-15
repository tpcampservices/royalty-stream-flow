# Harmony Payouts

Yes — here is the exact methodology, broken down so you can turn it into an AI app-builder prompt.

Your PDF describes an event-based royalty distribution model where: once an event pays the required licence fee, a researcher captures the music performed, the log is cleaned and structured, weighted codes are applied, and the licence fee is converted into a point value so each work gets a monetary allocation based on actual usage. It also shows that only events with verified uploaded data are processed, while missing data stays pending.

1) Core methodology from your document

Step 1: Collect licence fees by source

Each licence source creates a revenue pool. In your PDF example, once an event pays a licence fee of $5,000 or more, a researcher is assigned and the event becomes eligible for logging and distribution. The principle for the app is that each source type should create its own pool, such as:

Radio

Special Events

Venues (bars/restaurants)

Shops and stores

Any other tariff class

The document also makes clear that distribution is based on net distributable revenue, and that funds remain pending where usage data is missing.

Step 2: Capture music usage logs

For the event example in your PDF, a researcher attends the event, records all music played from start to finish, and captures a full log of the performances. For the app, the same principle should apply across source pools:

Radio: station logs, playlists, cue sheets, fingerprinting data

Special Events: researcher logs, promoter-submitted set lists, mobile capture

Bars/Restaurants: sampled logs, DJ logs, monitoring device data

Shops/Stores: sampled ambient music logs, monitoring device data, declared playlists

The key rule is: no usage data, no final distribution for that pool segment. Missing or incomplete logs must move to a pending queue.

Step 3: Standardise the usage data

Your PDF says the captured data is transcribed into a structured template with these fields:

Use of song / usage code

Song code

Song title

Performing artiste

Original performer

Diffusion type (Live or DJ)

So the app must force all incoming usage data into one standard structure regardless of source.

Step 4: Match usage to the works database

The log entries must then be validated against the organisation’s works database so the correct work code, title, and rights ownership can be identified. The PDF also notes that this stage includes correcting work codes, spelling errors, and inconsistencies before final payment allocation.

Step 5: Apply weighting rules

Your document uses weighted usage classes to reflect the relative value of different types of performances. The sample chart shows:

HDL = headline live performance = 30

FTR = featured live performance = 25

FDM = featured DJ music = 15

DJM = other DJ music performances = 3

LIV = other live concert/member logs = 6

This means the app needs a weighting engine where each source pool can have its own weighting table.

Step 6: Calculate total weighted points for the pool or event

Once all log lines are classified, the app adds all the weighting values together to get the total weighted points for that source unit. In the PDF example:

FTR total = 400

FDM total = 135

Total weighted points = 535

Step 7: Calculate point value

The document then divides the licence fee for that event by the total weighted points:

Point Value = Total Licence Fee ÷ Total Weighted Points

Example from the PDF:

Licence fee = $10,000

Total weighted points = 535

Point value = $18.69 per point

Step 8: Calculate value for each musical use

Each work line is then assigned money based on:

Allocation for a usage line = Weight × Point Value

Examples from the PDF:

FTR line: 25 × 18.69 = 467.25

FDM line: 15 × 18.69 = 280.35

Step 9: Aggregate by work

If a song appears multiple times in the same pool, the app should sum all those line allocations into one work total for that distribution period.

Step 10: Split by ownership shares

After the work amount is known, the app must split the money among rights holders based on the registered ownership shares for that work:

composer share

author share

publisher share

administrator share

society share if applicable

This specific ownership-split formula is not detailed in the PDF, so this part is the necessary extension for the full app design.

Step 11: Move unmatched or disputed works to suspense

If a song has no valid work code, no ownership data, conflicting shares, or missing member account information, the app should not pay it immediately. It should move it to:

unmatched works

disputed works

pending distribution

suspense account

That approach matches the document’s logic that unverified data remains pending until corrected.

Step 12: Validate, approve, and pay

Your PDF says that after calculation the data is validated, corrected, and then uploaded into the payment system where payments are allocated to the appropriate rights holders. So the app should include:

pre-payment validation

approval workflow

locked distribution run

member statements

bank export / payment file

audit trail of all edits and approvals

2) Generalised methodology for all source pools

This is the best way to structure the app:

A. Collection layer

Record all licence fees collected by:

source type

tariff type

period

licensee

gross amount

adjustments

net distributable amount

B. Usage layer

Store all usage logs by:

source pool

reporting period

venue/station/event/store

date/time

song/work

usage type

quantity/frequency/duration if applicable

weight code

C. Matching layer

Match each usage line to:

work code

title

interested parties

share percentages

member account

D. Calculation layer

For each pool:

total net distributable amount

total weighted points

point value

line-level allocation

work-level aggregation

member-level split

E. Exception layer

Move problematic entries into:

unmatched

duplicate

invalid metadata

missing shares

disputed ownership

held for next run

F. Distribution layer

Generate:

member statements

pool summary reports

work-level allocation report

unmatched report

payment instructions

audit and approval logs

3) Formula logic for the app

Use this exact logic:

Pool Net Amount
pool_net = collected_fees - approved deductions

Weighted Units Per Usage Line
line_weight_units = usage_count × assigned_weight

If each log line is one occurrence, then:
line_weight_units = assigned_weight

Pool Total Weight
pool_total_weight = sum(all line_weight_units in the pool)

Point Value
point_value = pool_net / pool_total_weight

Usage Line Allocation
line_allocation = line_weight_units × point_value

Work Total
work_total = sum(all line_allocations for same work in same pool/period)

Member Allocation
member_amount = work_total × ownership_share

Final Payable to Member
final_member_payable = sum(all member_amounts across all pools) - holds/adjustments

4) How this should work by source type

Radio pool

Use station logs or automated music recognition logs. Count spins or verified plays per work. Apply radio-specific weighting if needed, then distribute the radio pool by weighted spins.

Special events pool

Use event researcher logs or set lists. Apply event performance weights like your PDF example, then calculate point value per event or per grouped event pool.

Venue pool: bars and restaurants

Use monitoring device logs, sampled logs, or declared playlists. Group all venue fees into a venue pool for the period, then distribute based on weighted tracked usages.

Shops and stores pool

Use sample-based or monitoring-based logs for background music. Group all licence fees from stores into one pool, then allocate based on verified music usage for that sector.

5) App modules the AI builder should create

The app should have these modules:

Members

member profiles

payment details

roles: writer, publisher, administrator, producer, performer

Works Registry

work codes

titles

alternate titles

ownership splits

status

Licensees

radio stations

event promoters

venues

shops/stores

Tariffs and Pools

tariff categories

source pools

collection periods

gross and net pool values

Usage Logs

log import

manual entry

mobile capture

CSV/Excel upload

validation status

Weighting Engine

source-specific rules

editable weight tables

effective dates

Matching and Validation

auto-match

manual match

duplicate detection

unmatched queue

Royalty Calculation Engine

point-value calculation

work-level aggregation

member-level split

adjustments

suspense handling

Approvals

draft run

review

approve

lock distribution

Payments and Statements

member statements

bank export

payment history

unpaid/held amounts

Reporting

pool summary

source-type performance

works paid

members paid

unmatched/disputed works

audit logs

6) Copy-ready prompt for your AI app builder

Use this:

Build a web-based royalty collection and distribution application for a copyright collection organisation.

The application must calculate royalties collected from multiple licence fee pools and distribute them to members based on verified music usage logs.

SOURCE POOLS:
- Radio
- Special Events
- Venues (bars and restaurants)
- Shops and stores

CORE BUSINESS LOGIC:
1. Record all licence fees collected by source type, tariff type, licensee, and distribution period.
2. For each source type, create a distributable pool using net distributable revenue.
3. Import or capture music usage logs for each pool. Logs may come from:
   - radio station logs
   - researcher event logs
   - DJ playlists
   - venue monitoring systems
   - shop/store background music logs
4. Standardise every log line into these fields:
   - source pool
   - period
   - event/station/venue/store ID
   - date
   - work code
   - song title
   - performing artist
   - original performer
   - diffusion type
   - usage code
   - usage quantity
5. Match each log line to the works database and ownership shares.
6. Apply weighting rules by usage code and source type.
7. Calculate line weight units:
   line_weight_units = usage_quantity × assigned_weight
8. Calculate pool total weight:
   pool_total_weight = sum(all line_weight_units)
9. Calculate point value:
   point_value = pool_net_amount / pool_total_weight
10. Calculate each usage line allocation:
   line_allocation = line_weight_units × point_value
11. Aggregate all usage line allocations by work.
12. Split each work amount among rights holders based on registered ownership shares.
13. Sum all amounts per member across all pools for the distribution period.
14. Move unmatched, disputed, or incomplete records into suspense and exclude them from payment until resolved.
15. Generate member statements, payment schedules, pool reports, unmatched reports, and audit logs.

WEIGHTING ENGINE:
The system must allow editable weighting codes per source type. Example event weights:
- HDL = 30
- FTR = 25
- FDM = 15
- DJM = 3
- LIV = 6

APP MODULES:
- Member management
- Works registration
- Ownership share registry
- Licensee management
- Tariff and pool setup
- Usage log import and capture
- Matching and validation workflow
- Royalty calculation engine
- Suspense and disputes module
- Approval workflow
- Member payment and statements
- Reporting dashboard
- Full audit trail

USER ROLES:
- Admin
- Licensing officer
- Distribution officer
- Researcher/logger
- Finance officer
- Reviewer/approver
- Member portal user

KEY FEATURES:
- CSV/Excel import for logs
- Mobile log capture for events
- Auto-match and manual-match workflow
- Editable distribution rules by source type
- Distribution preview before approval
- Lock final distribution run after approval
- Member statements and payment export
- Audit trail for every edit and calculation
- Dashboard showing collections, pool values, pending logs, unmatched works, and total paid

DATA TABLES:
- members
- works
- work_ownership_shares
- licensees
- tariffs
- licence_invoices
- licence_collections
- distribution_pools
- usage_logs
- usage_log_lines
- weighting_rules
- matched_works
- unmatched_records
- royalty_allocations
- member_statements
- payment_batches
- audit_logs

The UI should be professional, modern, and suitable for a collective management organisation. Include admin dashboard, log upload screens, calculation screens, unmatched works resolution screens, and member payment reports.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://royalty-stream-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/70ec6605-07f3-4f3d-8974-fc8387f438e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

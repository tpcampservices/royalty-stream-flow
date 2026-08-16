# Rights and catalog data model

This model keeps the musical composition and the sound recording as separate assets and separates credits from copyright ownership.

## Core distinctions

| Area | Stored in | Meaning |
| --- | --- | --- |
| Rights party capacities | `member_roles` | A person or organization may be a writer, publisher, administrator, performer, producer, or label. A capacity does not create ownership. |
| Musical work | `compositions` | The underlying song or composition, normally identified by an ISWC or internal work code. |
| Writer interests | `composition_writers` | Authorship role and copyright ownership percentage. |
| Publisher interests | `composition_publishers` | Publisher/administrator role, copyright ownership, separate collection authority, territory, and agreement dates. |
| Sound recording | `sound_recordings` | A particular recorded performance, normally identified by an ISRC. |
| Work embodied in recording | `recording_compositions` | Links a master to its composition. Several links are supported for medleys. |
| Performer credits | `recording_performers` | Main, featured, session and other performance credits. Credits do not imply ownership. |
| Producer credits | `recording_producers` | Production/engineering credit and optional contractual royalty points. Producer points do not imply master ownership. |
| Master rights | `recording_rights_holders` | Actual master ownership or an exclusive licence, including percentage, territory, term, and review state. |

## Percentage rules

- Recording-to-composition coverage may be entered progressively but cannot exceed 100%. It must equal 100% before a composition-rights distribution can pay the recording.
- Writer and publisher copyright ownership is combined and cannot exceed 100%. It must equal 100% before payment. Publisher collection authority is recorded separately and is not added to ownership.
- Worldwide confirmed `master_owner` interests must equal 100% before a master-rights distribution can pay the recording.
- Performer credits do not carry an ownership percentage.
- Producer royalty points are stored separately from master ownership.
- An administrator may collect a controlled share while owning 0% of the copyright.

The calculation screen no longer normalizes incomplete shares to 100%. Incomplete ownership remains in suspense and payment generation is locked.

## Legacy conversion

Migration `20260816020000_rights_catalog_model.sql` preserves the former mixed `recording_shares` data:

- It creates one provisional composition per existing sound recording and links it at 100%.
- Composer, Author and Arranger rows become composition writer interests.
- Publisher rows become original-publisher interests.
- Performer and Producer rows become credits. Their former percentage is retained as `legacy_share_percentage` for review and is not interpreted as ownership.
- Label rows become worldwide master-owner interests marked `needs_review`.
- `recording_shares` becomes read-only and remains available as an audit source.

Provisional compositions should be reviewed after deployment. If several sound recordings are versions of the same song, merge the duplicate compositions and relink the recordings before running a distribution.

## Deployment dependency

Apply migrations in filename order:

1. `20260816010000_auth_roles_multitenancy.sql`
2. `20260816020000_rights_catalog_model.sql`

Neither migration has been applied merely because it exists in GitHub. Lovable Cloud must execute both migrations before these screens can use the new tables.
